import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Loader2, AlertCircle } from 'lucide-react';
import { voiceChatService } from '../services/webrtcVoice';
import { socketService } from '../services/socket';
import { Player } from '../types/game';
import { AvatarImg } from './AvatarImg';

interface VoiceChatBarProps {
  roomId: string;
  playerId?: string;
  players?: Player[];
  voicePlayerIds?: string[];
  className?: string;
  showAvatars?: boolean;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({
  roomId,
  playerId,
  players = [],
  voicePlayerIds = [],
  className = '',
  showAvatars = false
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    voiceChatService.init(socket);

    const unsubscribe = voiceChatService.subscribe((status) => {
      setIsConnected(status.isConnected);
      setIsMuted(status.isMuted);
      setIsConnecting(false);
      if (status.error) {
        setErrorMessage(status.error);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleVoice = async () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([25, 35]);
    }

    if (isConnected) {
      voiceChatService.stopVoice(playerId);
    } else {
      setErrorMessage(null);
      setIsConnecting(true);
      const success = await voiceChatService.startVoice(roomId, playerId);
      if (!success) {
        setIsConnecting(false);
      }
    }
  };

  const handleToggleMute = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    const newMuted = voiceChatService.toggleMute();
    setIsMuted(newMuted);
  };

  const activeVoicePlayers = (players || []).filter(p => voicePlayerIds?.includes(p.id));

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Mini Avatar Stack for Header/Compact View */}
      {showAvatars && activeVoicePlayers.length > 0 && (
        <div
          className="flex -space-x-2 items-center mr-1.5"
          title={`In voice: ${activeVoicePlayers.map(p => p.name).join(', ')}`}
        >
          {activeVoicePlayers.slice(0, 3).map((vp) => (
            <div
              key={vp.id}
              className="relative w-6 h-6 rounded-full ring-2 ring-emerald-400 bg-slate-900 overflow-hidden shadow-sm shrink-0"
            >
              <AvatarImg avatar={vp.avatar} alt={vp.name} className="w-full h-full object-cover" />
            </div>
          ))}
          {activeVoicePlayers.length > 3 && (
            <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 ring-1.5 ring-emerald-400 text-[9px] font-black flex items-center justify-center shrink-0">
              +{activeVoicePlayers.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Error Tooltip Banner */}
      {errorMessage && (
        <div className="absolute top-full mt-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-rose-950/95 border border-rose-500/50 text-rose-200 text-xs font-semibold shadow-2xl flex items-center gap-1.5 animate-fade-in backdrop-blur-md">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isConnected ? (
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-slate-900/85 border border-emerald-400/50 shadow-md backdrop-blur-md shrink-0 whitespace-nowrap">
          {/* Mute/Unmute Toggle Button */}
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[11px] sm:text-xs transition-all active:scale-95 touch-manipulation select-none cursor-pointer ${
              isMuted
                ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50 hover:bg-rose-500/40'
                : 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 hover:bg-emerald-400'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? (
              <>
                <MicOff size={13} className="text-rose-300" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Mic size={13} className="text-white animate-pulse" />
                <span>Live</span>
                {/* Dynamic live equalizer waves */}
                <div className="flex items-center gap-0.5 ml-0.5">
                  <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.05s' }} />
                  <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.25s' }} />
                </div>
              </>
            )}
          </button>

          {/* Leave Voice Button */}
          <button
            onClick={handleToggleVoice}
            className="p-1 sm:p-1.5 rounded-full bg-rose-600/30 hover:bg-rose-600/60 border border-rose-400/30 text-rose-200 hover:text-white transition-all active:scale-95 touch-manipulation cursor-pointer"
            title="Leave Voice Chat"
          >
            <PhoneOff size={13} />
          </button>
        </div>
      ) : (
        /* Mobile-Enhanced Single-Line Join Voice Button */
        <button
          onClick={handleToggleVoice}
          disabled={isConnecting}
          className="relative group flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-[11px] sm:text-xs shadow-md shadow-emerald-500/25 border border-emerald-300/40 transition-all active:scale-95 cursor-pointer touch-manipulation select-none disabled:opacity-75 disabled:pointer-events-none whitespace-nowrap shrink-0"
          title="Join Live Voice Chat"
        >
          {isConnecting ? (
            <>
              <Loader2 size={13} className="animate-spin text-white" />
              <span className="tracking-wide">Connecting...</span>
            </>
          ) : (
            <>
              {/* Radar beacon pulsing indicator */}
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-sm" />
              </span>
              <PhoneCall size={13} className="text-white drop-shadow shrink-0" />
              <span className="tracking-wide hidden xs:inline sm:inline">Join Voice</span>
              <span className="tracking-wide inline xs:hidden sm:hidden">Voice</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
