import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/game';
import { COLOR_STYLES } from '../utils/boardCoordinates';
import { sounds } from '../services/soundEffects';

interface DiceRollerProps {
  currentTurnPlayer: Player;
  isMyTurn: boolean;
  diceValue: number | null;
  rollId?: string | null;
  isRolling: boolean;
  onRoll: () => void;
  canRoll: boolean;
  compact?: boolean;
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

// Computes the next forward angle (always strictly forward >= current + minSpins) settling on target orientation
const getNextForwardAngle = (current: number, targetMod: number, minSpins: number = 720): number => {
  const normTarget = ((targetMod % 360) + 360) % 360;
  const normCurrent = ((current % 360) + 360) % 360;
  let diff = normTarget - normCurrent;
  if (diff <= 0) diff += 360; // strictly forward spin
  return current + minSpins + diff;
};

export const DiceRoller: React.FC<DiceRollerProps> = ({
  currentTurnPlayer,
  isMyTurn,
  diceValue,
  rollId,
  onRoll,
  canRoll,
  compact = false
}) => {
  const [isTumbling, setIsTumbling] = useState(false);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [displayedValue, setDisplayedValue] = useState<number>(diceValue || 1);

  // Eager click handler for 0ms delay: instant tactile vibration, sound, and lift
  const handleDiceClick = () => {
    if (!canRoll) return;

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

  useEffect(() => {
    if (diceValue !== null) {
      setIsTumbling(true);
      sounds.playDiceRoll();

      // Multi-revolution tumble target, always strictly forward relative to previous rotation
      const base = FACE_ROTATIONS[diceValue] || { x: 0, y: 0 };

      setRotation((prev) => {
        const nextX = getNextForwardAngle(prev.x, base.x, 720);
        const nextY = getNextForwardAngle(prev.y, base.y, 720);
        return {
          x: nextX,
          y: nextY,
          z: 0 // Settles orthogonal and square to prevent oblique peek-through
        };
      });

      const timer = setTimeout(() => {
        setIsTumbling(false);
        setDisplayedValue(diceValue);
      }, 420);

      return () => clearTimeout(timer);
    }
  }, [diceValue, rollId]);

  const colorStyle = COLOR_STYLES[currentTurnPlayer.color];

  // Render authentic dots / pips for each face
  const renderFacePips = (num: number) => {
    switch (num) {
      case 1:
        return (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-500 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner self-end" />
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between w-full h-full p-2">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner self-center" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner self-end" />
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-2 gap-1.5 p-2 w-full h-full items-center justify-items-center">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
          </div>
        );
      case 5:
        return (
          <div className="relative w-full h-full p-2">
            <div className="absolute top-2 left-2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="absolute top-2 right-2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-rose-500 shadow-inner" />
            <div className="absolute bottom-2 left-2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
            <div className="absolute bottom-2 right-2 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-900 shadow-inner" />
          </div>
        );
      case 6:
        return (
          <div className="grid grid-cols-2 grid-rows-3 gap-1 p-2 w-full h-full items-center justify-items-center">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner" />
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-900 shadow-inner" />
          </div>
        );
      default:
        return null;
    }
  };

  const cubeSize = compact ? 54 : 64; // px
  const halfSize = cubeSize / 2;

  return (
    <div className={`flex ${compact ? 'flex-row items-center justify-between px-3.5 py-2' : 'flex-col items-center justify-center p-3 sm:p-4'} rounded-2xl glass-panel shadow-xl border border-white/15 select-none touch-manipulation`}>
      {/* Player Turn Status */}
      <div className={`flex ${compact ? 'flex-col items-start gap-1' : 'items-center gap-1.5 mb-2'}`}>
        <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/10">
          <span className="text-xl sm:text-2xl">{currentTurnPlayer.avatar}</span>
          <span className={`text-xs sm:text-sm font-black ${colorStyle.textColor} truncate max-w-[130px]`}>
            {isMyTurn ? "Your Turn" : currentTurnPlayer.name}
          </span>
          {canRoll && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 animate-pulse ml-0.5">
              ROLL
            </span>
          )}
        </div>

        {compact && (
          <span className="text-[11px] text-white/70 font-medium pl-1">
            {canRoll ? "👉 Tap dice to roll!" : diceValue ? `Rolled ${diceValue}` : "Waiting for turn..."}
          </span>
        )}
      </div>

      {/* 3D Dice Stage with Perspective */}
      <div className="relative flex flex-col items-center justify-center py-1">
        <div
          onClick={canRoll ? handleDiceClick : undefined}
          className={`relative cursor-pointer transition-transform duration-150 active:scale-95 ${
            canRoll ? 'cursor-pointer hover:scale-105 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'cursor-not-allowed opacity-90'
          }`}
          style={{
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            perspective: '1100px'
          }}
        >
          {/* 3D Tumbling Cube Container */}
          <div
            className="w-full h-full relative"
            style={{
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg) ${
                isTumbling ? 'translateY(-14px) scale(1.06)' : 'translateY(0px) scale(1)'
              }`,
              transition: isTumbling
                ? 'transform 0.42s cubic-bezier(0.18, 0.9, 0.32, 1)'
                : 'transform 0.16s ease-out'
            }}
          >
            {/* Common Face Style */}
            {[
              { num: 1, transform: `rotateY(0deg) translateZ(${halfSize}px)` },
              { num: 2, transform: `rotateY(180deg) translateZ(${halfSize}px)` },
              { num: 3, transform: `rotateY(-90deg) translateZ(${halfSize}px)` },
              { num: 4, transform: `rotateY(90deg) translateZ(${halfSize}px)` },
              { num: 5, transform: `rotateX(-90deg) translateZ(${halfSize}px)` },
              { num: 6, transform: `rotateX(90deg) translateZ(${halfSize}px)` }
            ].map((face) => (
              <div
                key={face.num}
                className="absolute inset-0 rounded-xl bg-white border border-slate-300 shadow-md flex items-center justify-center select-none"
                style={{
                  transform: face.transform,
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  boxShadow: 'inset 0 0 5px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                {renderFacePips(face.num)}
              </div>
            ))}
          </div>

          {/* Dynamic 3D Contact Shadow beneath dice */}
          <div
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 blur-[3px] pointer-events-none transition-all duration-300"
            style={{
              width: isTumbling ? '35px' : '52px',
              height: isTumbling ? '8px' : '14px',
              opacity: isTumbling ? 0.35 : 0.8
            }}
          />
        </div>

        {/* Six Celebration Sparkle */}
        {displayedValue === 6 && !isTumbling && (
          <span className="absolute -top-1 -right-2 text-base animate-bounce pointer-events-none">
            ✨
          </span>
        )}
      </div>

      {/* Button & Turn Guidance */}
      {!compact && (
        <div className="mt-2 text-center w-full">
          {canRoll ? (
            <button
              onClick={onRoll}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all animate-pulse"
            >
              🎲 Roll Dice!
            </button>
          ) : diceValue !== null ? (
            <p className="text-xs font-semibold text-pink-300">
              {isMyTurn ? "Select token to move" : `Rolled a ${diceValue}`}
            </p>
          ) : (
            <p className="text-xs text-white/50">
              Waiting for turn...
            </p>
          )}
        </div>
      )}
    </div>
  );
};
