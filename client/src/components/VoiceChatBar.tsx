import React, { useState, useEffect } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff } from 'lucide-react';
import { voiceChatService } from '../services/webrtcVoice';
import { socketService } from '../services/socket';

interface VoiceChatBarProps {
  roomId: string;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({ roomId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    voiceChatService.init(socket, (status) => {
      setIsConnected(status.isConnected);
      setIsMuted(status.isMuted);
      if (status.error) {
        setErrorMessage(status.error);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    });

    return () => {
      if (voiceChatService.getIsActive()) {
        voiceChatService.stopVoice();
      }
    };
  }, []);

  const handleToggleVoice = async () => {
    if (isConnected) {
      voiceChatService.stopVoice();
    } else {
      setErrorMessage(null);
      await voiceChatService.startVoice(roomId);
    }
  };

  const handleToggleMute = () => {
    const newMuted = voiceChatService.toggleMute();
    setIsMuted(newMuted);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel shadow-md border border-white/15">
      {errorMessage && (
        <span className="text-[11px] text-rose-300 font-medium px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30">
          {errorMessage}
        </span>
      )}

      {isConnected ? (
        <>
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-full transition-all active:scale-95 ${
              isMuted
                ? 'bg-rose-500/30 text-rose-300 hover:bg-rose-500/40 border border-rose-400/40'
                : 'bg-emerald-500/30 text-emerald-300 hover:bg-emerald-500/40 border border-emerald-400/40'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Animated audio wave when active */}
          {!isMuted && (
            <div className="flex items-center gap-0.5 px-1">
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          )}

          <span className="text-xs font-semibold text-emerald-300 hidden sm:inline">
            Voice Connected
          </span>

          <button
            onClick={handleToggleVoice}
            className="p-2 rounded-full bg-rose-600/40 hover:bg-rose-600/60 text-white transition-all active:scale-95 ml-1"
            title="Leave Voice"
          >
            <PhoneOff size={15} />
          </button>
        </>
      ) : (
        <button
          onClick={handleToggleVoice}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/30 text-pink-200 text-xs font-semibold transition-all active:scale-95"
        >
          <PhoneCall size={14} className="text-pink-300" />
          <span>Join Couple Voice</span>
        </button>
      )}
    </div>
  );
};
