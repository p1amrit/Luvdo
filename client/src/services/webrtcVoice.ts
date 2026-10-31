import { Socket } from 'socket.io-client';

export class VoiceChatService {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private isMuted: boolean = false;
  private onStatusChangeCallback: ((status: { isConnected: boolean; isMuted: boolean; error?: string }) => void) | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  public init(socket: Socket, onStatusChange?: (status: { isConnected: boolean; isMuted: boolean; error?: string }) => void) {
    this.socket = socket;
    if (onStatusChange) {
      this.onStatusChangeCallback = onStatusChange;
    }

    this.socket.on('voice-user-joined', async ({ socketId }) => {
      console.log('[Voice] Peer joined voice chat:', socketId);
      if (this.localStream) {
        await this.createPeerConnection(socketId, true);
      }
    });

    this.socket.on('voice-signal', async ({ signal, fromSocketId }) => {
      console.log('[Voice] Received signal from:', fromSocketId, signal.type);
      let pc = this.peerConnections.get(fromSocketId);
      if (!pc) {
        pc = await this.createPeerConnection(fromSocketId, false);
      }

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket?.emit('voice-signal', {
          toSocketId: fromSocketId,
          signal: answer
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.warn('[Voice] Failed to add ICE candidate', e);
        }
      }
    });

    this.socket.on('voice-user-left', ({ socketId }) => {
      console.log('[Voice] Peer left voice chat:', socketId);
      const pc = this.peerConnections.get(socketId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(socketId);
      }
    });
  }

  public async startVoice(roomId: string): Promise<boolean> {
    this.roomId = roomId;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone not supported on this browser or context.');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('voice-signal', {
          toSocketId: remoteSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[Voice] Received remote audio stream');
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.autoplay = true;
      remoteAudio.play().catch(e => console.warn('[Voice] Remote audio autoplay blocked:', e));
    };

    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Connection state with ${remoteSocketId}:`, pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.peerConnections.delete(remoteSocketId);
      }
    };

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket?.emit('voice-signal', {
        toSocketId: remoteSocketId,
        signal: offer
      });
    }

    return pc;
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

  private notifyStatus(isConnected: boolean, error?: string) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({
        isConnected,
        isMuted: this.isMuted,
        error
      });
    }
  }
}

export const voiceChatService = new VoiceChatService();
