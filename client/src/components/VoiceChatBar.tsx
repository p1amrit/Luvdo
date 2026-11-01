import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, Loader2, AlertCircle } from 'lucide-react';
import { voiceChatService } from '../services/webrtcVoice';
import { socketService } from '../services/socket';

interface VoiceChatBarProps {
  roomId: string;
  className?: string;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({ roomId, className = '' }) => {
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
      voiceChatService.stopVoice();
    } else {
      setErrorMessage(null);
      setIsConnecting(true);
      const success = await voiceChatService.startVoice(roomId);
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

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Error Tooltip Banner */}
      {errorMessage && (
        <div className="absolute top-full mt-2 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-50 whitespace-nowrap px-3 py-1.5 rounded-xl bg-rose-950/95 border border-rose-500/50 text-rose-200 text-xs font-semibold shadow-2xl flex items-center gap-1.5 animate-fade-in backdrop-blur-md">
          <AlertCircle size={14} className="text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isConnected ? (
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full bg-slate-900/85 border border-emerald-400/50 shadow-lg shadow-emerald-950/50 backdrop-blur-md">
          {/* Mute/Unmute Toggle Button */}
          <button
            onClick={handleToggleMute}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all active:scale-95 touch-manipulation select-none cursor-pointer ${
              isMuted
                ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50 hover:bg-rose-500/40'
                : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40 hover:bg-emerald-400'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? (
              <>
                <MicOff size={15} className="text-rose-300" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Mic size={15} className="text-white animate-pulse" />
                <span>Mic Live</span>
                {/* Dynamic live equalizer waves */}
                <div className="flex items-center gap-0.5 ml-0.5">
                  <span className="w-0.5 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.05s' }} />
                  <span className="w-0.5 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.25s' }} />
                </div>
              </>
            )}
          </button>

          {/* Leave Voice Button */}
          <button
            onClick={handleToggleVoice}
            className="p-1.5 sm:p-2 rounded-full bg-rose-600/30 hover:bg-rose-600/60 border border-rose-400/30 text-rose-200 hover:text-white transition-all active:scale-95 touch-manipulation cursor-pointer"
            title="Leave Voice Chat"
          >
            <PhoneOff size={14} />
          </button>
        </div>
      ) : (
        /* Mobile-Enhanced Join Voice Button */
        <button
          onClick={handleToggleVoice}
          disabled={isConnecting}
          className="relative group flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 border border-emerald-300/40 transition-all active:scale-95 cursor-pointer touch-manipulation select-none disabled:opacity-75 disabled:pointer-events-none"
          title="Join Live Voice Chat (Ultra-low latency)"
        >
          {isConnecting ? (
            <>
              <Loader2 size={15} className="animate-spin text-white" />
              <span className="tracking-wide">Connecting...</span>
            </>
          ) : (
            <>
              {/* Radar beacon pulsing indicator */}
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white shadow-sm" />
              </span>
              <PhoneCall size={15} className="text-white drop-shadow shrink-0" />
              <span className="tracking-wide">Join Live Voice</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
