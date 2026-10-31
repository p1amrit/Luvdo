import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, CloudRain, Flame, Sparkles } from 'lucide-react';
import { socketService } from '../services/socket';

interface LofiPlayerProps {
  roomId: string;
  musicState?: {
    isPlaying: boolean;
    trackIndex: number;
    trackTitle: string;
    currentTime: number;
  };
}

const AMBIENT_TRACKS = [
  { id: 'rain', name: 'Rain on Windowpane', icon: CloudRain, color: 'text-blue-300' },
  { id: 'fire', name: 'Cozy Fireplace Hearth', icon: Flame, color: 'text-amber-300' },
  { id: 'starlight', name: 'Midnight Starlight Dream', icon: Sparkles, color: 'text-purple-300' }
];

export const LofiPlayer: React.FC<LofiPlayerProps> = ({ roomId, musicState }) => {
  const [isPlaying, setIsPlaying] = useState(musicState?.isPlaying || false);
  const [activeTrackIndex, setActiveTrackIndex] = useState(musicState?.trackIndex || 0);
  const [volume, setVolume] = useState(0.5);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const stopAudio = () => {
    if (noiseNodeRef.current) {
      try {
        (noiseNodeRef.current as AudioScheduledSourceNode).stop();
      } catch {
        // ignore
      }
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
  };

  const startAudio = (trackIndex: number) => {
    stopAudio();

    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    gainNode.connect(ctx.destination);
    gainNodeRef.current = gainNode;

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Pink / Brown Noise synthesis
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    if (trackIndex === 0) {
      // Rain: Lowpass with slight high resonance
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
    } else if (trackIndex === 1) {
      // Fireplace: bandpass
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
    } else {
      // Starlight: dreamy soft lowpass
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, ctx.currentTime);
    }

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    whiteNoise.start();
    noiseNodeRef.current = whiteNoise;
  };

  const togglePlayback = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      startAudio(activeTrackIndex);
    } else {
      stopAudio();
    }

    socketService.syncMusic(roomId, {
      isPlaying: nextState,
      trackIndex: activeTrackIndex,
      trackTitle: AMBIENT_TRACKS[activeTrackIndex].name,
      currentTime: 0
    });
  };

  const switchTrack = (index: number) => {
    setActiveTrackIndex(index);
    if (isPlaying) {
      startAudio(index);
    }
    socketService.syncMusic(roomId, {
      isPlaying,
      trackIndex: index,
      trackTitle: AMBIENT_TRACKS[index].name,
      currentTime: 0
    });
  };

  // Sync with partner
  useEffect(() => {
    const socket = socketService.getSocket();
    const handleSync = ({ musicState: remoteMusic }: { musicState: { isPlaying: boolean; trackIndex: number } }) => {
      if (remoteMusic.trackIndex !== activeTrackIndex) {
        setActiveTrackIndex(remoteMusic.trackIndex);
      }
      if (remoteMusic.isPlaying !== isPlaying) {
        setIsPlaying(remoteMusic.isPlaying);
        if (remoteMusic.isPlaying) {
          startAudio(remoteMusic.trackIndex);
        } else {
          stopAudio();
        }
      }
    };

    socket.on('music-synced', handleSync);
    return () => {
      socket.off('music-synced', handleSync);
      stopAudio();
    };
  }, [activeTrackIndex, isPlaying]);

  const CurrentIcon = AMBIENT_TRACKS[activeTrackIndex].icon;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-white/15 shadow-md">
        <button
          onClick={togglePlayback}
          className={`p-2 rounded-full transition-all active:scale-95 ${
            isPlaying
              ? 'bg-pink-500/30 text-pink-300 border border-pink-400/40 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
              : 'bg-white/10 text-white/70 hover:bg-white/20'
          }`}
          title={isPlaying ? 'Pause Ambient Sound' : 'Play Ambient Sound'}
        >
          <CurrentIcon size={16} />
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-pink-200/90 font-medium hover:text-white transition-colors"
        >
          <Music size={13} className="text-pink-300" />
          <span className="hidden md:inline">{AMBIENT_TRACKS[activeTrackIndex].name}</span>
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded text-white/50 hover:text-white"
        >
          {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      {/* Expanded Track & Volume Selector Popup */}
      {isExpanded && (
        <div className="absolute top-12 left-0 w-64 p-3 rounded-2xl glass-panel bg-slate-950/90 backdrop-blur-xl border border-white/20 shadow-2xl z-50">
          <p className="text-xs font-bold text-white mb-2">Ambient Atmosphere</p>
          <div className="space-y-1 mb-3">
            {AMBIENT_TRACKS.map((t, idx) => {
              const Icon = t.icon;
              const isActive = activeTrackIndex === idx;
              return (
                <button
                  key={t.id}
                  onClick={() => switchTrack(idx)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors ${
                    isActive
                      ? 'bg-pink-500/25 border border-pink-400/40 text-pink-200 font-semibold'
                      : 'hover:bg-white/10 text-white/70'
                  }`}
                >
                  <Icon size={14} className={t.color} />
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <Volume2 size={12} className="text-white/60" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (gainNodeRef.current && audioCtxRef.current) {
                  gainNodeRef.current.gain.setValueAtTime(newVol * 0.15, audioCtxRef.current.currentTime);
                }
              }}
              className="w-full accent-pink-500 h-1 bg-white/20 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
