import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Crown, Target, Sparkles } from 'lucide-react';
import { Player, RoomVibe } from '../types/game';
import { sounds } from '../services/soundEffects';
import { COLOR_STYLES } from '../utils/boardCoordinates';
import { AvatarImg } from './AvatarImg';

interface VictoryModalProps {
  winner: Player;
  byForfeit?: boolean;
  myPlayerId: string;
  roomId: string;
  vibe?: RoomVibe;
  targetTokens?: number;
  isHost?: boolean;
  onPlayAgain: () => void;
  onReturnToLobby?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  byForfeit = false,
  myPlayerId,
  targetTokens = 4,
  isHost = false,
  onPlayAgain,
  onReturnToLobby
}) => {
  const isMe = winner.id === myPlayerId;
  const colStyle = COLOR_STYLES[winner.color];

  useEffect(() => {
    sounds.playVictoryChime();

    // Multi-stage grand celebration confetti bursts
    const fireBurst = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.65 },
        ...opts,
        particleCount: Math.floor(70 * particleRatio)
      });
    };

    fireBurst(0.25, { spread: 26, startVelocity: 55 });
    fireBurst(0.2, { spread: 60 });
    fireBurst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fireBurst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fireBurst(0.1, { spread: 120, startVelocity: 45 });

    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: ['#f43f5e', '#a855f7', '#fbbf24', '#34d399', '#38bdf8']
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors: ['#f43f5e', '#a855f7', '#fbbf24', '#34d399', '#38bdf8']
      });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-sm sm:max-w-md p-6 sm:p-7 rounded-[32px] bg-gradient-to-b from-slate-900/95 via-purple-950/90 to-slate-950/95 border border-amber-400/40 shadow-[0_0_80px_rgba(245,158,11,0.35)] text-center text-white overflow-hidden">
        {/* Ambient Top Golden Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-b from-amber-500/25 via-pink-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Top Trophy Emblem */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-500 p-0.5 shadow-[0_0_35px_rgba(251,191,36,0.6)] mb-3 ring-4 ring-amber-400/30">
          <div className="w-full h-full rounded-[22px] bg-slate-950/80 flex items-center justify-center">
            <Trophy size={32} className="text-amber-300 drop-shadow" />
          </div>
          <Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-300 animate-spin" />
        </div>

        {/* Celebratory Pill Badge */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm">
            {byForfeit ? '⚡ Victory By Forfeit' : isMe ? '🎉 Victory Royale' : '👑 Match Champion'}
          </span>
        </div>

        {/* Main Heading */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-yellow-100">
          {isMe ? 'You Won The Match!' : `${winner.name} Won!`}
        </h2>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm text-pink-200/80 mt-1 mb-5">
          {byForfeit
            ? 'Opponent left the match — victory is rightfully yours!'
            : isMe
            ? 'Outstanding play! All tokens brought safely home to victory!'
            : 'Congratulations! A masterclass performance on the board.'}
        </p>

        {/* Champion Showcase Card */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/15 mb-5 shadow-inner backdrop-blur-md">
          <div className="relative inline-block mb-2">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-tr from-amber-400 to-yellow-300 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)] overflow-hidden">
              <AvatarImg avatar={winner.avatar} alt={winner.name} className="w-full h-full object-cover rounded-[14px]" />
            </div>
            <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center shadow-md text-slate-950 ring-2 ring-slate-950">
              <Crown size={15} className="fill-current text-slate-950" />
            </div>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white">{winner.name}</h3>

          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-white/20 bg-white/10">
              <span>{colStyle?.emoji}</span>
              <span className={colStyle?.textColor || 'text-white'}>{colStyle?.name || winner.color}</span>
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              <Target size={12} />
              <span>{targetTokens}/{targetTokens} Home</span>
            </span>
          </div>
        </div>

        {/* Clean Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white font-black text-sm sm:text-base shadow-[0_10px_30px_rgba(244,63,94,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw size={18} />
            <span>{isHost ? 'Play Again' : 'Play Again'}</span>
          </button>

          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="w-full py-2.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 hover:text-white font-bold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home size={15} />
              <span>Return to Lobby</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
