import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Player } from '../types/game';
import { COLOR_STYLES } from '../utils/boardCoordinates';
import { sounds } from '../services/soundEffects';

interface DiceRollerProps {
  currentTurnPlayer: Player;
  isMyTurn: boolean;
  diceValue: number | null;
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

export const DiceRoller: React.FC<DiceRollerProps> = ({
  currentTurnPlayer,
  isMyTurn,
  diceValue,
  onRoll,
  canRoll,
  compact = false
}) => {
  const [isTumbling, setIsTumbling] = useState(false);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [displayedValue, setDisplayedValue] = useState<number>(diceValue || 1);

  useEffect(() => {
    if (diceValue !== null) {
      setIsTumbling(true);
      sounds.playDiceRoll();

      // Multi-revolution tumble target
      const base = FACE_ROTATIONS[diceValue] || { x: 0, y: 0 };
      // Add multiple full spins (720 or 1080 deg) for dramatic rolling
      const spinsX = (Math.floor(Math.random() * 2) + 2) * 360;
      const spinsY = (Math.floor(Math.random() * 2) + 3) * 360;

      setRotation({
        x: base.x + spinsX,
        y: base.y + spinsY,
        z: (Math.random() - 0.5) * 40
      });

      const timer = setTimeout(() => {
        setIsTumbling(false);
        setDisplayedValue(diceValue);
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [diceValue]);

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
    <div className={`flex ${compact ? 'flex-row items-center gap-3 px-3 py-2' : 'flex-col items-center justify-center p-3 sm:p-4'} rounded-2xl glass-panel shadow-xl border border-white/15 select-none touch-manipulation`}>
      {/* Player Turn Status */}
      <div className={`flex items-center gap-1.5 ${compact ? 'flex-col items-start' : 'mb-2'}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-lg sm:text-xl">{currentTurnPlayer.avatar}</span>
          <span className={`text-xs sm:text-sm font-bold ${colorStyle.textColor} truncate max-w-[110px]`}>
            {isMyTurn ? "Your Turn" : currentTurnPlayer.name}
          </span>
        </div>

        {compact && (
          <span className="text-[10px] text-white/60">
            {canRoll ? "Tap to Roll" : diceValue ? `Rolled ${diceValue}` : "Waiting..."}
          </span>
        )}
      </div>

      {/* 3D Dice Stage with Perspective */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <div
          onClick={canRoll ? onRoll : undefined}
          className={`relative cursor-pointer transition-transform duration-200 active:scale-95 ${
            canRoll ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-90'
          }`}
          style={{
            width: `${cubeSize}px`,
            height: `${cubeSize}px`,
            perspective: '600px'
          }}
        >
          {/* 3D Tumbling Cube Container */}
          <div
            className="w-full h-full relative"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg) ${
                isTumbling ? 'translateY(-22px) scale(1.08)' : 'translateY(0px) scale(1)'
              }`,
              transition: isTumbling
                ? 'transform 0.9s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                : 'transform 0.3s ease-out'
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
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-100 via-white to-slate-200 border border-slate-300 shadow-md flex items-center justify-center backface-hidden"
                style={{
                  transform: face.transform,
                  boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.2)'
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
