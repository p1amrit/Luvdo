import { Socket } from 'socket.io-client';

export type VoiceStatus = { isConnected: boolean; isMuted: boolean; error?: string };
export type VoiceStatusListener = (status: VoiceStatus) => void;

// Helper to optimize SDP for conversational real-time low-latency Opus audio
function optimizeSdpForLowLatency(sdp: string): string {
  // Enforce Opus mono, 20ms packet intervals (ptime=20), and 32kbps bitrate with DTX
  return sdp.replace(/(a=fmtp:(\d+) [^\r\n]+)/g, (match, p1, payloadType) => {
    if (sdp.includes(`a=rtpmap:${payloadType} opus/48000`)) {
      return `${p1};minptime=10;maxptime=20;ptime=20;stereo=0;sprop-stereo=0;maxaveragebitrate=32000;usedtx=1`;
    }
    return match;
  });
}

export class VoiceChatService {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private isMuted: boolean = false;
  private statusListeners: Set<VoiceStatusListener> = new Set();
  private initializedSocketId: string | null = null;

  // Ultra-low latency ICE configuration with diverse STUN servers & pooling
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  public init(socket: Socket, onStatusChange?: VoiceStatusListener) {
    this.socket = socket;
    if (onStatusChange) {
      this.subscribe(onStatusChange);
    }

    if (this.initializedSocketId === socket.id) {
      return;
    }
    this.initializedSocketId = socket.id || 'connected';

    this.socket.on('voice-user-joined', async ({ socketId }) => {
      console.log('[Voice] Peer joined voice chat:', socketId);
      if (this.localStream) {
        await this.createPeerConnection(socketId, true);
      }
    });

    this.socket.on('voice-signal', async ({ signal, fromSocketId }) => {
      console.log('[Voice] Received signal from:', fromSocketId, signal.type || 'candidate');
      let pc = this.peerConnections.get(fromSocketId);
      if (!pc) {
        pc = await this.createPeerConnection(fromSocketId, false);
      }

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));

        // Drain any pending ICE candidates that arrived early
        await this.drainPendingCandidates(fromSocketId, pc);

        const rawAnswer = await pc.createAnswer();
        const optimizedAnswerSdp = optimizeSdpForLowLatency(rawAnswer.sdp || '');
        const answer = new RTCSessionDescription({ type: 'answer', sdp: optimizedAnswerSdp });
        await pc.setLocalDescription(answer);

        this.socket?.emit('voice-signal', {
          toSocketId: fromSocketId,
          signal: answer
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        // Drain any pending ICE candidates that arrived early
        await this.drainPendingCandidates(fromSocketId, pc);
      } else if (signal.candidate) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('[Voice] Failed to add ICE candidate', e);
          }
        } else {
          // Queue candidate until remote description is set
          const queue = this.pendingCandidates.get(fromSocketId) || [];
          queue.push(signal.candidate);
          this.pendingCandidates.set(fromSocketId, queue);
        }
      }
    });

    this.socket.on('voice-user-left', ({ socketId }) => {
      console.log('[Voice] Peer left voice chat:', socketId);
      this.cleanupPeer(socketId);
    });
  }

  private async drainPendingCandidates(peerId: string, pc: RTCPeerConnection) {
    const queue = this.pendingCandidates.get(peerId) || [];
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (e) {
        console.warn('[Voice] Failed to add queued candidate', e);
      }
    }
    this.pendingCandidates.delete(peerId);
  }

  public async startVoice(roomId: string): Promise<boolean> {
    this.roomId = roomId;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported on this browser or context.');
      }

      // Tuned constraints for real-time low-latency speech (mono, 48kHz, minimum hardware buffer)
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1, // Mono: halves packet bandwidth & buffer latency
          sampleRate: 48000, // Matches native WebRTC Opus sample rate
          // @ts-ignore
          latency: 0.005 // Minimal hardware buffer
        },
        video: false
      });

      this.isMuted = false;
      this.socket?.emit('voice-join', { roomId, peerId: this.socket.id });
      this.notifyStatus(true);
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Microphone permission denied';
      console.warn('[Voice] Could not access microphone:', errorMsg);
      this.notifyStatus(false, errorMsg);
      return false;
    }
  }

  private async createPeerConnection(remoteSocketId: string, isInitiator: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(remoteSocketId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Set high network priority on audio sender
    pc.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'audio') {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          // @ts-ignore
          params.encodings[0].priority = 'high';
          // @ts-ignore
          params.encodings[0].networkPriority = 'high';
          // @ts-ignore
          params.encodings[0].maxBitrate = 32000;
          sender.setParameters(params).catch(() => {});
        } catch (_) {}
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('voice-signal', {
          toSocketId: remoteSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[Voice] Received remote audio stream with zero-latency buffer');
      const receiver = event.receiver as any;
      if (receiver) {
        // Remove browser artificial playout buffer (slashes 150-250ms of delay)
        if ('playoutDelayHint' in receiver) {
          receiver.playoutDelayHint = 0;
        }
        if ('jitterBufferTarget' in receiver) {
          receiver.jitterBufferTarget = 0;
        }
      }

      let audioEl = this.audioElements.get(remoteSocketId);
      if (!audioEl) {
        audioEl = new Audio();
        audioEl.autoplay = true;
        // @ts-ignore
        audioEl.playsInline = true;
        this.audioElements.set(remoteSocketId, audioEl);
      }
      audioEl.srcObject = event.streams[0];
      audioEl.play().catch(e => console.warn('[Voice] Remote audio autoplay blocked:', e));
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Connection state with ${remoteSocketId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupPeer(remoteSocketId);
      }
    };

    if (isInitiator) {
      const rawOffer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      const optimizedOfferSdp = optimizeSdpForLowLatency(rawOffer.sdp || '');
      const offer = new RTCSessionDescription({ type: 'offer', sdp: optimizedOfferSdp });
      await pc.setLocalDescription(offer);

      this.socket?.emit('voice-signal', {
        toSocketId: remoteSocketId,
        signal: offer
      });
    }

    return pc;
  }

  private cleanupPeer(socketId: string) {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }
    const audioEl = this.audioElements.get(socketId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      this.audioElements.delete(socketId);
    }
    this.pendingCandidates.delete(socketId);
  }

  public toggleMute(): boolean {
    if (!this.localStream) return true;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });
    this.notifyStatus(true);
    return this.isMuted;
  }

  public stopVoice() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    this.audioElements.forEach(audioEl => {
      audioEl.pause();
      audioEl.srcObject = null;
    });
    this.audioElements.clear();
    this.pendingCandidates.clear();

    if (this.socket && this.roomId) {
      this.socket.emit('voice-leave', { roomId: this.roomId });
    }
    this.notifyStatus(false);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsActive(): boolean {
    return this.localStream !== null;
  }

  public subscribe(listener: VoiceStatusListener): () => void {
    this.statusListeners.add(listener);
    // Emit immediate current state
    try {
      listener({
        isConnected: this.getIsActive(),
        isMuted: this.isMuted
      });
    } catch (_) {}

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(isConnected: boolean, error?: string) {
    const status: VoiceStatus = {
      isConnected,
      isMuted: this.isMuted,
      error
    };
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (err) {
        console.error('[Voice] Error in status listener:', err);
      }
    });
  }
}

export const voiceChatService = new VoiceChatService();
