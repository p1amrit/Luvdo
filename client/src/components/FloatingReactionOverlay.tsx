import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingReaction, ReactionType, RoomVibe } from '../types/game';
import { socketService } from '../services/socket';
import { sounds } from '../services/soundEffects';

interface FloatingReactionOverlayProps {
  roomId: string;
  playerName: string;
  vibe?: RoomVibe;
}

interface ActiveReactionItem extends FloatingReaction {
  id: string;
  startX: number;
  startY: number;
}

const REACTION_ICONS: Record<ReactionType, string> = {
  kiss: '💋',
  rose: '🌹',
  hearts: '💖',
  pillow: '🪶',
  sparkle: '✨',
  pizza: '🍕',
  fire: '🔥',
  laugh: '😂',
  clown: '🤡',
  trophy: '🏆',
  target: '🎯'
};

export const FloatingReactionOverlay: React.FC<FloatingReactionOverlayProps> = ({ roomId, playerName, vibe = 'friends' }) => {
  const [activeReactions, setActiveReactions] = useState<ActiveReactionItem[]>([]);
  const [partyModeView, setPartyModeView] = useState(vibe !== 'couple');

  useEffect(() => {
    setPartyModeView(vibe !== 'couple');
  }, [vibe]);

  useEffect(() => {
    const socket = socketService.getSocket();

    const handleReaction = (reaction: FloatingReaction) => {
      const newItem: ActiveReactionItem = {
        ...reaction,
        startX: reaction.x ?? (20 + Math.random() * 60),
        startY: reaction.y ?? (70 + Math.random() * 15)
      };

      if (reaction.type === 'kiss' || reaction.type === 'hearts') {
        sounds.playKissSound();
      } else if (reaction.type === 'fire' || reaction.type === 'trophy') {
        sounds.playVictoryChime();
      } else {
        sounds.playDareCardSparkle();
      }

      setActiveReactions((prev) => [...prev.slice(-15), newItem]);

      // Remove after animation
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((item) => item.id !== newItem.id));
      }, 2400);
    };

    socket.on('floating-reaction-triggered', handleReaction);

    return () => {
      socket.off('floating-reaction-triggered', handleReaction);
    };
  }, []);

  const triggerReaction = (type: ReactionType) => {
    socketService.sendReaction(roomId, {
      type,
      fromName: playerName,
      x: 30 + Math.random() * 40,
      y: 80
    });
  };

  const friendButtons: ReactionType[] = ['fire', 'pizza', 'laugh', 'clown', 'trophy', 'sparkle'];
  const coupleButtons: ReactionType[] = ['kiss', 'hearts', 'rose', 'pillow', 'sparkle'];

  const displayedButtons = partyModeView ? friendButtons : coupleButtons;

  return (
    <>
      {/* Floating Animated Emojis in the Viewport */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {activeReactions.map((item) => (
            <motion.div
              key={item.id}
              initial={{
                x: `${item.startX}vw`,
                y: `${item.startY}vh`,
                opacity: 0,
                scale: 0.5,
                rotate: 0
              }}
              animate={{
                y: `${item.startY - 35}vh`,
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.4, 1.2, 0.9],
                rotate: [-15, 15, -10, 10]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="absolute flex flex-col items-center select-none"
            >
              <span className="text-4xl filter drop-shadow-lg">
                {REACTION_ICONS[item.type] || '✨'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 mt-1 rounded-full bg-black/60 text-pink-200 backdrop-blur-sm shadow border border-white/20">
                {item.fromName}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Reaction Floating Bar */}
      <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 px-2.5 sm:px-3 rounded-full glass-panel shadow-2xl border border-white/20">
        <button
          onClick={() => setPartyModeView(!partyModeView)}
          className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors mr-1 hidden sm:inline"
          title="Toggle reaction palette"
        >
          {partyModeView ? '🎉 Party' : '💖 Couple'}
        </button>

        {displayedButtons.map((btn) => (
          <button
            key={btn}
            onClick={() => triggerReaction(btn)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 transition-transform active:scale-90 text-xl sm:text-2xl"
            title={`Send ${btn}`}
          >
            {REACTION_ICONS[btn]}
          </button>
        ))}
      </div>
    </>
  );
};
