import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DareCard, Player } from '../types/game';
import { sounds } from '../services/soundEffects';
import { socketService } from '../services/socket';

interface DareModalProps {
  roomId: string;
  activeDare: {
    card: DareCard;
    recipient: Player;
    timestamp: number;
  } | null;
  myPlayerId: string;
}

export const DareModal: React.FC<DareModalProps> = ({ roomId, activeDare, myPlayerId }) => {
  useEffect(() => {
    if (activeDare) {
      sounds.playDareCardSparkle();
    }
  }, [activeDare]);

  if (!activeDare) return null;

  const isMyDare = activeDare.recipient.id === myPlayerId;
  const { card, recipient } = activeDare;

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'party-dare':
        return {
          title: 'Party Challenge',
          badge: 'bg-purple-500/30 text-purple-200 border-purple-400/40',
          gradient: 'from-purple-900/90 to-indigo-950/90',
          glow: 'rgba(168, 85, 247, 0.6)'
        };
      case 'roast':
        return {
          title: 'Playful Roast',
          badge: 'bg-orange-500/30 text-orange-200 border-orange-400/40',
          gradient: 'from-orange-950/90 to-red-950/90',
          glow: 'rgba(249, 115, 22, 0.6)'
        };
      case 'bet':
        return {
          title: 'Friend Bet / Snack IOU',
          badge: 'bg-emerald-500/30 text-emerald-200 border-emerald-400/40',
          gradient: 'from-emerald-950/90 to-teal-950/90',
          glow: 'rgba(16, 185, 129, 0.6)'
        };
      case 'fun-truth':
        return {
          title: 'Group Truth / Confession',
          badge: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40',
          gradient: 'from-cyan-950/90 to-blue-950/90',
          glow: 'rgba(6, 182, 212, 0.6)'
        };
      case 'sweet':
        return {
          title: 'Sweet Romance Prompt',
          badge: 'bg-pink-500/30 text-pink-200 border-pink-400/40',
          gradient: 'from-pink-900/90 to-rose-950/90',
          glow: 'rgba(244, 63, 94, 0.6)'
        };
      case 'playful':
        return {
          title: 'Playful Couple Dare',
          badge: 'bg-purple-500/30 text-purple-200 border-purple-400/40',
          gradient: 'from-purple-900/90 to-indigo-950/90',
          glow: 'rgba(168, 85, 247, 0.6)'
        };
      case 'flirty':
        return {
          title: 'Flirty Reward / Voucher',
          badge: 'bg-amber-500/30 text-amber-200 border-amber-400/40',
          gradient: 'from-amber-900/90 to-orange-950/90',
          glow: 'rgba(251, 146, 60, 0.6)'
        };
      default:
        return {
          title: 'Wild Dare Tile',
          badge: 'bg-pink-500/30 text-pink-200 border-pink-400/40',
          gradient: 'from-slate-900/90 to-purple-950/90',
          glow: 'rgba(244, 63, 94, 0.6)'
        };
    }
  };

  const theme = getCategoryTheme(card.category);

  const handleComplete = () => {
    socketService.completeDare(roomId);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          className={`relative w-full max-w-md p-6 rounded-3xl bg-gradient-to-b ${theme.gradient} border-2 border-white/30 shadow-[0_0_50px_${theme.glow}] text-white select-none`}
        >
          {/* Header Badge */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${theme.badge}`}>
              {theme.title}
            </span>
            <span className="text-3xl filter drop-shadow animate-pulse">
              {card.icon || '🎲'}
            </span>
          </div>

          {/* Recipient Notice */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">{recipient.avatar}</span>
            <p className="text-sm font-semibold text-white/90">
              {isMyDare ? "It's your card! Read or complete it for the room:" : `${recipient.name} drew this card!`}
            </p>
          </div>

          {/* Card Title & Content */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/15 my-4 shadow-inner">
            <h4 className="text-lg font-bold text-white mb-2">
              {card.title}
            </h4>
            <p className="text-sm sm:text-base text-white/90 leading-relaxed italic">
              "{card.prompt}"
            </p>
          </div>

          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleComplete}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>✨ Completed! Continue Game</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
