import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Player, PlayerColor } from '../types/game';
import { BorderTimer } from './BorderTimer';
import { AvatarImg } from './AvatarImg';
import { sounds } from '../services/soundEffects';

interface PlayerPodProps {
  player?: Player;
  color: PlayerColor;
  isCurrentTurn: boolean;
  isMyTurn: boolean;
  isLocalPlayer: boolean;
  turnTimePercent?: number;
  diceValue: number | null;
  lastDiceValue: number | null;
  rollId?: string | null;
  isRolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  align: 'left' | 'right';
  chatBubble?: { text: string; timestamp: number } | null;
  targetTokensToWin: number;
}

// 3D rotations required to display each face facing forward
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: 180 },
  3: { x: 0, y: 90 },
  4: { x: 0, y: -90 },
  5: { x: 90, y: 0 },
  6: { x: -90, y: 0 }
};

const getNextForwardAngle = (current: number, targetMod: number, minSpins: number = 720): number => {
  const normTarget = ((targetMod % 360) + 360) % 360;
  const normCurrent = ((current % 360) + 360) % 360;
  let diff = normTarget - normCurrent;
  if (diff <= 0) diff += 360;
  return current + minSpins + diff;
};

const COLOR_POD_CONFIG = {
  rose: {
    border: 'border-rose-500/50',
    activeGlow: 'shadow-[0_0_16px_rgba(244,63,94,0.55)]',
    text: 'text-rose-300',
    diceBg: 'bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700',
    ring: 'ring-rose-400',
    dot: 'bg-rose-500'
  },
  lavender: {
    border: 'border-purple-500/50',
    activeGlow: 'shadow-[0_0_16px_rgba(168,85,247,0.55)]',
    text: 'text-purple-300',
    diceBg: 'bg-gradient-to-br from-purple-500 via-indigo-600 to-purple-700',
    ring: 'ring-purple-400',
    dot: 'bg-purple-500'
  },
  peach: {
    border: 'border-amber-500/50',
    activeGlow: 'shadow-[0_0_16px_rgba(251,146,60,0.55)]',
    text: 'text-amber-300',
    diceBg: 'bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700',
    ring: 'ring-amber-400',
    dot: 'bg-amber-500'
  },
  mint: {
    border: 'border-teal-500/50',
    activeGlow: 'shadow-[0_0_16px_rgba(45,212,191,0.55)]',
    text: 'text-teal-300',
    diceBg: 'bg-gradient-to-br from-teal-500 via-emerald-600 to-teal-700',
    ring: 'ring-teal-400',
    dot: 'bg-teal-500'
  }
};

export const PlayerPod: React.FC<PlayerPodProps> = ({
  player,
  color,
  isCurrentTurn,
  isMyTurn,
  isLocalPlayer,
  turnTimePercent,
  diceValue,
  lastDiceValue,
  rollId,
  isRolling,
  canRoll,
  onRoll,
  align,
  chatBubble,
  targetTokensToWin
}) => {
  const [isTumbling, setIsTumbling] = useState(false);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [displayedValue, setDisplayedValue] = useState<number | null>(lastDiceValue || diceValue || null);

  const cfg = COLOR_POD_CONFIG[color];

  // Eager click handler for 0ms tactile vibration and roll
  const handleDiceClick = () => {
    if (!isCurrentTurn || !isMyTurn || !canRoll) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {
        // ignore
      }
    }

    setIsTumbling(true);
    sounds.playDiceRoll();
    onRoll();
  };

  // Trigger 3D tumble when this player rolls
  useEffect(() => {
    if (isCurrentTurn && diceValue !== null) {
      setIsTumbling(true);
      sounds.playDiceRoll();

      const base = FACE_ROTATIONS[diceValue] || { x: 0, y: 0 };
      setRotation((prev) => {
        const nextX = getNextForwardAngle(prev.x, base.x, 720);
        const nextY = getNextForwardAngle(prev.y, base.y, 720);
        return { x: nextX, y: nextY, z: 0 };
      });

      const timer = setTimeout(() => {
        setIsTumbling(false);
        setDisplayedValue(diceValue);
      }, 420);

      return () => clearTimeout(timer);
    } else if (diceValue !== null) {
      setDisplayedValue(diceValue);
    }
  }, [diceValue, rollId, isCurrentTurn]);

  // If no player in this quadrant, keep empty invisible space to preserve layout
  if (!player) {
    return <div className="w-[130px] sm:w-[155px] h-[64px] invisible" />;
  }

  // Authentic dice face pips renderer
  const renderFacePips = (num: number | null) => {
    if (!num) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
        </div>
      );
    }

    switch (num) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <div className={`w-3.5 h-3.5 rounded-full ${cfg.dot} shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_0_6px_rgba(255,255,255,0.8)]`} />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner self-center" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-1 p-1.5 w-full h-full items-center justify-items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-1.5">
            <div className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${cfg.dot} shadow-inner`} />
            <div className="absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-0.5 p-1 w-full h-full items-center justify-items-center">
            <div className="w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2 h-2 rounded-full bg-slate-900 shadow-inner" />
          </div>
        );
      default:
        return null;
    }
  };

  const cubeSize = 42; // px
  const halfSize = cubeSize / 2;

  // Avatar Component
  const AvatarNode = (
    <div className="relative flex flex-col items-center">
      {/* Speech Chat Bubble (pops directly over the player's avatar) */}
      <AnimatePresence>
        {chatBubble && (
          <motion.div
            key={`bubble-${player.id}-${chatBubble.timestamp}`}
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none min-w-[70px] max-w-[130px] filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
          >
            <div className="relative px-2 py-1 rounded-xl bg-white text-slate-950 font-black text-[10px] leading-tight shadow-xl break-words text-center border-2 border-slate-900">
              <span>{chatBubble.text}</span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-slate-900 transform rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Box with Turn BorderTimer */}
      <div
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center bg-slate-950/80 border ${
          isCurrentTurn
            ? `${cfg.border} ${cfg.activeGlow}`
            : 'border-white/15 bg-black/40'
        } transition-all duration-300 shadow-lg`}
      >
        {/* Authoritative Rectangular Border Timer running directly around the avatar */}
        {isCurrentTurn && turnTimePercent !== undefined && (
          <BorderTimer percent={turnTimePercent} rx={14} strokeWidth={3} />
        )}

        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden flex items-center justify-center p-0.5">
          <AvatarImg avatar={player.avatar} alt={player.name} />
        </div>
      </div>

      {/* Player Name & Score */}
      <div className="mt-1 flex flex-col items-center max-w-[72px] sm:max-w-[85px]">
        <span
          className={`text-[10px] sm:text-xs font-black truncate w-full text-center ${
            isCurrentTurn ? cfg.text : 'text-white/80'
          }`}
          title={player.name}
        >
          {player.name}
        </span>
        <span className="text-[9px] font-bold text-white/50 tracking-tight">
          🏆 {player.tokensHome || 0}/{targetTokensToWin}
        </span>
      </div>
    </div>
  );

  // Dice Box Component
  const DiceNode = (
    <div className="flex flex-col items-center">
      <div
        onClick={handleDiceClick}
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
          isCurrentTurn
            ? `${cfg.diceBg} shadow-lg ${cfg.activeGlow}`
            : 'bg-slate-900/80 border border-white/10 opacity-70'
        } ${
          isCurrentTurn && isMyTurn && canRoll
            ? 'cursor-pointer hover:scale-105 active:scale-95 ring-2 ring-white/90 animate-pulse'
            : ''
        }`}
        style={{ perspective: '300px' }}
      >
        {/* Tap To Roll Indicator */}
        {isCurrentTurn && isMyTurn && canRoll && !isTumbling && diceValue === null && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-slate-900" />
          </span>
        )}

        {/* 3D Tumbling Cube when active */}
        {isTumbling ? (
          <motion.div
            className="relative"
            style={{
              width: `${cubeSize}px`,
              height: `${cubeSize}px`,
              transformStyle: 'preserve-3d'
            }}
            animate={{
              rotateX: rotation.x,
              rotateY: rotation.y,
              rotateZ: rotation.z
            }}
            transition={{
              duration: 0.42,
              ease: [0.15, 0.85, 0.35, 1.0]
            }}
          >
            {[
              { face: 1, transform: `translateZ(${halfSize}px)` },
              { face: 2, transform: `rotateY(180deg) translateZ(${halfSize}px)` },
              { face: 3, transform: `rotateY(-90deg) translateZ(${halfSize}px)` },
              { face: 4, transform: `rotateY(90deg) translateZ(${halfSize}px)` },
              { face: 5, transform: `rotateX(-90deg) translateZ(${halfSize}px)` },
              { face: 6, transform: `rotateX(90deg) translateZ(${halfSize}px)` }
            ].map(({ face, transform }) => (
              <div
                key={`face-${face}`}
                style={{
                  width: `${cubeSize}px`,
                  height: `${cubeSize}px`,
                  transform,
                  backfaceVisibility: 'hidden'
                }}
                className="absolute inset-0 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center select-none"
              >
                {renderFacePips(face)}
              </div>
            ))}
          </motion.div>
        ) : (
          /* Static Clean Resting Face */
          <div
            style={{ width: `${cubeSize}px`, height: `${cubeSize}px` }}
            className={`rounded-xl flex items-center justify-center shadow-md select-none ${
              isCurrentTurn
                ? 'bg-white border border-slate-200'
                : displayedValue
                ? 'bg-white/90 border border-white/40'
                : 'bg-black/20 border border-white/5'
            }`}
          >
            {renderFacePips(displayedValue)}
          </div>
        )}
      </div>

      {/* Small Roll/Turn status caption */}
      <span className="mt-1 text-[9px] font-black tracking-wider uppercase text-center text-white/50 h-3">
        {isCurrentTurn && isMyTurn && canRoll
          ? 'TAP ROLL'
          : isCurrentTurn
          ? 'ROLLING...'
          : displayedValue
          ? `ROLLED ${displayedValue}`
          : ''}
      </span>
    </div>
  );

  return (
    <div
      className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl glass-panel border ${
        isCurrentTurn ? `${cfg.border} bg-white/[0.08]` : 'border-white/10 bg-black/30'
      } transition-all duration-300`}
    >
      {align === 'left' ? (
        <>
          {AvatarNode}
          {DiceNode}
        </>
      ) : (
        <>
          {DiceNode}
          {AvatarNode}
        </>
      )}
    </div>
  );
};
