import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GameState, PlayerColor, Token } from '../types/game';
import {
  MAIN_TRACK_COORDS,
  RUNWAY_COORDS,
  BASE_SLOTS_COORDS,
  COLOR_STYLES,
  GridCoord,
  getCoordForProgress
} from '../utils/boardCoordinates';
import { sounds } from '../services/soundEffects';

interface LudoBoardProps {
  gameState: GameState;
  myPlayerId: string;
  onSelectToken: (tokenId: number) => void;
  onScreenTouch?: (x: number, y: number) => void;
  homeChatBubbles?: Record<string, { text: string; timestamp: number } | null>;
  turnTimePercent?: number;
}

// 4 Starting Squares (where tokens launch onto the board in traditional Ludo)
const STARTING_TILES: Record<number, { color: PlayerColor; arrow: string; dirLabel: string }> = {
  0: { color: 'rose', arrow: '▶', dirLabel: 'START' },      // Rose arm, moving East
  13: { color: 'lavender', arrow: '▼', dirLabel: 'START' }, // Lavender arm, moving South
  26: { color: 'peach', arrow: '◀', dirLabel: 'START' },    // Peach arm, moving West
  39: { color: 'mint', arrow: '▲', dirLabel: 'START' }      // Mint arm, moving North
};

// 4 Safe Stumps (traditional Charkoni / Star sanctuaries where tokens are immune to capture)
const SAFE_STUMP_INDICES = [8, 21, 34, 47];

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  myPlayerId,
  onSelectToken,
  onScreenTouch,
  homeChatBubbles,
  turnTimePercent
}) => {
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const movableTokenIds = isMyTurn ? (gameState.movableTokenIds || []) : [];

  const rosePlayer = gameState.players.find(p => p.color === 'rose');
  const lavenderPlayer = gameState.players.find(p => p.color === 'lavender');
  const peachPlayer = gameState.players.find(p => p.color === 'peach');
  const mintPlayer = gameState.players.find(p => p.color === 'mint');

  // Track previous progress and active hop
  const prevProgressRef = useRef<Record<string, number>>({});
  const [hoppingToken, setHoppingToken] = useState<{ key: string; step: number; isRewind?: boolean } | null>(null);
  const tokenTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  // Step-by-step walking & reverse rewinding kill animation runner
  useEffect(() => {
    gameState.players.forEach(player => {
      player.tokens.forEach(token => {
        const key = `${player.color}-${token.id}`;
        const prevProg = prevProgressRef.current[key];
        const targetProg = token.progress;

        // If progress didn't change, do not interrupt any ongoing animation
        if (prevProg === targetProg) return;

        // Progress changed -> update stored progress
        prevProgressRef.current[key] = targetProg;

        // Clear only this token's previous running timers
        if (tokenTimersRef.current[key]) {
          tokenTimersRef.current[key].forEach(t => clearTimeout(t));
          tokenTimersRef.current[key] = [];
        }

        if (prevProg !== undefined && targetProg > prevProg && prevProg >= 0) {
          // Walking forward step-by-step (silky-smooth 105ms pace with clean easing)
          const stepsCount = targetProg - prevProg;
          const stepSpeed = 105;
          const timers: ReturnType<typeof setTimeout>[] = [];

          for (let step = 1; step <= stepsCount; step++) {
            const nextVal = prevProg + step;
            const timer = setTimeout(() => {
              setHoppingToken({ key, step: nextVal, isRewind: false });
              sounds.playTokenStep(step);

              if (step === stepsCount) {
                if (targetProg === 56) {
                  sounds.playHomeArrival();
                } else if (targetProg >= 0 && targetProg <= 50) {
                  const startIndices: Record<string, number> = { rose: 0, lavender: 13, peach: 26, mint: 39 };
                  const tileIdx = ((startIndices[player.color] ?? 0) + targetProg) % 52;
                  if ([0, 8, 13, 21, 26, 34, 39, 47].includes(tileIdx)) {
                    sounds.playSafeLanding();
                  }
                }
                setTimeout(() => setHoppingToken(null), 100);
              }
            }, (step - 1) * stepSpeed);
            timers.push(timer);
          }
          tokenTimersRef.current[key] = timers;
        } else if (prevProg !== undefined && targetProg === 0 && prevProg === -1) {
          // Token spawned from base onto track
          sounds.playTokenSpawn();
        } else if (prevProg !== undefined && targetProg === -1 && prevProg >= 0) {
          // Token captured/killed: rapid rewind backwards along the track
          const rewindStepsCount = prevProg + 1;
          const rewindSpeed = Math.max(25, Math.min(45, Math.floor(500 / rewindStepsCount)));
          const timers: ReturnType<typeof setTimeout>[] = [];

          for (let s = 1; s <= rewindStepsCount; s++) {
            const rewindVal = (s === rewindStepsCount) ? -1 : prevProg - s;
            const timer = setTimeout(() => {
              setHoppingToken({ key, step: rewindVal, isRewind: true });
              sounds.playRewindStep();

              if (s === rewindStepsCount) {
                sounds.playCapturePop();
                setTimeout(() => setHoppingToken(null), 120);
              }
            }, (s - 1) * rewindSpeed);
            timers.push(timer);
          }
          tokenTimersRef.current[key] = timers;
        }
      });
    });
  }, [gameState]);

  // Map every token to its current grid row & col coordinate based on animated progress
  const placedTokens: Array<{
    playerColor: PlayerColor;
    playerId: string;
    token: Token;
    coord: GridCoord;
    isMovable: boolean;
    isHopping: boolean;
    isRewinding: boolean;
  }> = [];

  gameState.players.forEach(player => {
    player.tokens.forEach((token) => {
      const key = `${player.color}-${token.id}`;
      // When actively hopping or rewinding, use the animated step; otherwise ALWAYS use the authoritative token.progress
      const currentProg = (hoppingToken && hoppingToken.key === key)
        ? hoppingToken.step
        : token.progress;
      const coord = getCoordForProgress(player.color, currentProg, token.id);

      const isMovable = isMyTurn && player.id === myPlayerId && movableTokenIds.includes(token.id);
      const isHopping = hoppingToken?.key === key && !hoppingToken?.isRewind;
      const isRewinding = hoppingToken?.key === key && !!hoppingToken?.isRewind;

      placedTokens.push({
        playerColor: player.color,
        playerId: player.id,
        token,
        coord,
        isMovable,
        isHopping,
        isRewinding
      });
    });
  });

  const handleBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onScreenTouch) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onScreenTouch(x, y);
    }
  };

  // Traditional Ludo visual elements on track tiles
  const getSpecialCellContent = (r: number, c: number) => {
    const mainIndex = MAIN_TRACK_COORDS.findIndex(item => item.r === r && item.c === c);
    if (mainIndex === -1) return null;

    // 1. Starting Squares: Traditional colored entry tile with directional arrow & START badge
    if (STARTING_TILES[mainIndex]) {
      const startInfo = STARTING_TILES[mainIndex];
      return (
        <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none select-none leading-none gap-0.5">
          <span className="text-[10px] sm:text-xs text-white font-black filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {startInfo.arrow}
          </span>
          <span className="text-[6.5px] sm:text-[8px] font-black uppercase tracking-tighter text-white/90">
            {startInfo.dirLabel}
          </span>
        </div>
      );
    }

    // 2. Safe Stumps (Indices 8, 21, 34, 47): Traditional golden charkoni sanctuary with star shield
    if (SAFE_STUMP_INDICES.includes(mainIndex)) {
      return (
        <div className="w-full h-full flex items-center justify-center pointer-events-none select-none relative p-0.5">
          {/* Inner traditional dashed charkoni cross-border */}
          <div className="absolute inset-0.5 border border-dashed border-amber-300/40 rounded pointer-events-none" />
          <div className="relative w-4 h-4 sm:w-5 sm:h-5 rounded bg-amber-400/25 border border-amber-300/90 flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.6)]">
            <span className="text-amber-200 text-[10px] sm:text-xs font-black filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              ⭐
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const getRunwayColor = (r: number, c: number): string | null => {
    for (const [colKey, runway] of Object.entries(RUNWAY_COORDS)) {
      if (runway.some(item => item.r === r && item.c === c)) {
        return colKey;
      }
    }
    return null;
  };

  return (
    <div
      onClick={handleBoardClick}
      className="relative w-full max-w-[min(96vw,500px)] aspect-square mx-auto p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl glass-panel shadow-[0_12px_45px_rgba(0,0,0,0.6)] border border-white/20 select-none touch-manipulation"
    >
      {/* 15x15 Board Grid */}
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] sm:gap-[2px] bg-slate-950/80 p-1 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden">

        {/* 1. Base Corner: Rose (Top-Left, 0..5, 0..5) */}
        <div className={`relative col-start-1 col-span-6 row-start-1 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-rose-950/80 via-pink-900/50 to-rose-900/30 p-2 border border-rose-500/40 flex items-center justify-center ${
          !rosePlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[84%] h-[84%] rounded-xl bg-slate-950/60 border border-rose-500/20 shadow-inner" />
        </div>

        {/* 2. Base Corner: Lavender (Top-Right, 0..5, 9..14) */}
        <div className={`relative col-start-10 col-span-6 row-start-1 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-950/80 via-indigo-900/50 to-purple-900/30 p-2 border border-purple-500/40 flex items-center justify-center ${
          !lavenderPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[84%] h-[84%] rounded-xl bg-slate-950/60 border border-purple-500/20 shadow-inner" />
        </div>

        {/* 3. Base Corner: Peach (Bottom-Right, 9..14, 9..14) */}
        <div className={`relative col-start-10 col-span-6 row-start-10 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-950/80 via-orange-900/50 to-amber-900/30 p-2 border border-amber-500/40 flex items-center justify-center ${
          !peachPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[84%] h-[84%] rounded-xl bg-slate-950/60 border border-amber-500/20 shadow-inner" />
        </div>

        {/* 4. Base Corner: Mint (Bottom-Left, 9..14, 0..5) */}
        <div className={`relative col-start-1 col-span-6 row-start-10 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-teal-950/80 via-emerald-900/50 to-teal-900/30 p-2 border border-teal-500/40 flex items-center justify-center ${
          !mintPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[84%] h-[84%] rounded-xl bg-slate-950/60 border border-teal-500/20 shadow-inner" />
        </div>

        {/* Center: Traditional 4-Triangle Ludo Home (rows 6..8, cols 6..8) */}
        <div className="col-start-7 col-span-3 row-start-7 row-span-3 rounded-xl bg-slate-900 border border-white/20 relative overflow-hidden flex items-center justify-center shadow-inner">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            {/* Top triangle: Lavender */}
            <polygon points="0,0 100,0 50,50" fill="#a855f7" fillOpacity="0.55" stroke="#a855f7" strokeWidth="0.5" />
            {/* Right triangle: Peach */}
            <polygon points="100,0 100,100 50,50" fill="#fb923c" fillOpacity="0.55" stroke="#fb923c" strokeWidth="0.5" />
            {/* Bottom triangle: Mint */}
            <polygon points="100,100 0,100 50,50" fill="#2dd4bf" fillOpacity="0.55" stroke="#2dd4bf" strokeWidth="0.5" />
            {/* Left triangle: Rose */}
            <polygon points="0,100 0,0 50,50" fill="#f43f5e" fillOpacity="0.55" stroke="#f43f5e" strokeWidth="0.5" />
            {/* Center star badge */}
            <circle cx="50" cy="50" r="13" fill="#090d16" stroke="#ffffff" strokeWidth="1.2" />
            <text x="50" y="55" fontSize="13" textAnchor="middle" fill="#facc15" dominantBaseline="middle">⭐</text>
          </svg>
        </div>

        {/* Regular Grid Track Cells */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((__, c) => {
            const isBaseCorner =
              (r < 6 && c < 6) ||
              (r < 6 && c > 8) ||
              (r > 8 && c < 6) ||
              (r > 8 && c > 8);
            const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

            if (isBaseCorner || isCenter) return null;

            const runwayColor = getRunwayColor(r, c);
            const specialContent = getSpecialCellContent(r, c);

            // Starting squares & Safe Stumps highlight
            const mainIndex = MAIN_TRACK_COORDS.findIndex(item => item.r === r && item.c === c);
            let cellBg = 'bg-white/[0.05] hover:bg-white/[0.1]';

            if (mainIndex === 0) {
              cellBg = 'bg-gradient-to-br from-rose-600/80 via-rose-700/70 to-pink-800/70 border-2 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]';
            } else if (mainIndex === 13) {
              cellBg = 'bg-gradient-to-br from-purple-600/80 via-purple-700/70 to-indigo-800/70 border-2 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]';
            } else if (mainIndex === 26) {
              cellBg = 'bg-gradient-to-br from-amber-600/80 via-orange-700/70 to-amber-800/70 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,146,60,0.4)]';
            } else if (mainIndex === 39) {
              cellBg = 'bg-gradient-to-br from-teal-600/80 via-emerald-700/70 to-teal-800/70 border-2 border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.4)]';
            } else if (SAFE_STUMP_INDICES.includes(mainIndex)) {
              // 4 Traditional Safe Stumps
              cellBg = 'bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-yellow-950/70 border-2 border-amber-400/80 shadow-[inset_0_0_8px_rgba(251,191,36,0.35),0_0_10px_rgba(245,158,11,0.35)]';
            } else if (runwayColor === 'rose') cellBg = 'bg-rose-500/40 border-rose-400/40';
            else if (runwayColor === 'lavender') cellBg = 'bg-purple-500/40 border-purple-400/40';
            else if (runwayColor === 'peach') cellBg = 'bg-amber-500/40 border-amber-400/40';
            else if (runwayColor === 'mint') cellBg = 'bg-teal-500/40 border-teal-400/40';

            return (
              <div
                key={`cell-${r}-${c}`}
                style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                className={`relative rounded flex items-center justify-center border border-white/[0.08] transition-colors ${cellBg}`}
              >
                {specialContent}
              </div>
            );
          })
        )}

        {/* Base Sunken Token Slot Circles (Directly on 15x15 grid for 100% exact alignment with tokens) */}
        {(['rose', 'lavender', 'peach', 'mint'] as PlayerColor[]).map((col) => {
          const player = gameState.players.find(p => p.color === col);
          const slots = BASE_SLOTS_COORDS[col];
          const slotBg =
            col === 'rose'
              ? 'border-rose-400/60 bg-rose-950/70 shadow-inner'
              : col === 'lavender'
              ? 'border-purple-400/60 bg-purple-950/70 shadow-inner'
              : col === 'peach'
              ? 'border-amber-400/60 bg-amber-950/70 shadow-inner'
              : 'border-teal-400/60 bg-teal-950/70 shadow-inner';

          const dotBg =
            col === 'rose' ? 'bg-rose-400/50' :
            col === 'lavender' ? 'bg-purple-400/50' :
            col === 'peach' ? 'bg-amber-400/50' :
            'bg-teal-400/50';

          return slots.map((coord, slotIdx) => (
            <div
              key={`base-slot-${col}-${slotIdx}`}
              style={{
                gridRowStart: coord.r + 1,
                gridColumnStart: coord.c + 1
              }}
              className={`z-10 w-full h-full flex items-center justify-center pointer-events-none ${
                !player ? 'opacity-25' : ''
              }`}
            >
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border ${slotBg} flex items-center justify-center`}>
                <div className={`w-1.5 h-1.5 rounded-full ${dotBg}`} />
              </div>
            </div>
          ));
        })}

        {/* Tokens Overlay with Fast Hopping, Safe Stump Multi-Token Clustering, & Kill Rewind */}
        {(() => {
          // Group tokens by coordinate so multiple tokens on the same safe stump or tile never obscure each other
          const cellTokensMap = new Map<string, typeof placedTokens>();
          placedTokens.forEach((t) => {
            const cellKey = `${t.coord.r}-${t.coord.c}`;
            if (!cellTokensMap.has(cellKey)) {
              cellTokensMap.set(cellKey, []);
            }
            cellTokensMap.get(cellKey)!.push(t);
          });

          return placedTokens.map((item) => {
            const colorCfg = COLOR_STYLES[item.playerColor];
            const isSelectedMovable = item.isMovable;
            const isHopping = item.isHopping;
            const isRewinding = item.isRewinding;

            const cellKey = `${item.coord.r}-${item.coord.c}`;
            const cellGroup = cellTokensMap.get(cellKey) || [item];
            const clusterCount = cellGroup.length;
            const clusterIndex = cellGroup.indexOf(item);

            // Compute cluster offset & scale when multiple tokens occupy the same cell
            let clusterX = 0;
            let clusterY = 0;
            let clusterScale = 1;

            if (clusterCount === 2) {
              clusterScale = 0.82;
              if (clusterIndex === 0) {
                clusterX = -4.5;
                clusterY = -4.5;
              } else {
                clusterX = 4.5;
                clusterY = 4.5;
              }
            } else if (clusterCount === 3) {
              clusterScale = 0.72;
              if (clusterIndex === 0) {
                clusterX = -5.5;
                clusterY = -5;
              } else if (clusterIndex === 1) {
                clusterX = 5.5;
                clusterY = -5;
              } else {
                clusterX = 0;
                clusterY = 5.5;
              }
            } else if (clusterCount >= 4) {
              clusterScale = 0.65;
              if (clusterIndex === 0) {
                clusterX = -5.5;
                clusterY = -5.5;
              } else if (clusterIndex === 1) {
                clusterX = 5.5;
                clusterY = -5.5;
              } else if (clusterIndex === 2) {
                clusterX = -5.5;
                clusterY = 5.5;
              } else {
                clusterX = 5.5;
                clusterY = 5.5;
              }
            }

            return (
              <motion.div
                key={`token-${item.playerColor}-${item.token.id}`}
                layout
                transition={
                  isRewinding
                    ? { duration: 0.045, ease: 'linear' }
                    : isHopping
                    ? { duration: 0.105, ease: 'easeInOut' }
                    : { type: 'spring', stiffness: 420, damping: 28 }
                }
                style={{
                  gridRowStart: item.coord.r + 1,
                  gridColumnStart: item.coord.c + 1
                }}
                animate={
                  isRewinding
                    ? { scale: 1.15, rotate: -360, y: -6, x: 0 }
                    : isHopping
                    ? { scale: 1.18, y: -7, x: 0, rotate: 0 }
                    : isSelectedMovable
                    ? {
                        scale: [clusterScale, clusterScale * 1.16, clusterScale],
                        y: [clusterY, clusterY - 3, clusterY],
                        x: clusterX,
                        rotate: 0
                      }
                    : {
                        scale: clusterScale,
                        x: clusterX,
                        y: clusterY,
                        rotate: 0,
                        opacity: 1
                      }
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelectedMovable) {
                    sounds.playTokenStep();
                    onSelectToken(item.token.id);
                  }
                }}
                className={`${
                  isSelectedMovable ? 'z-40' : 'z-30'
                } w-full h-full flex items-center justify-center touch-manipulation active:scale-90 transition-transform ${
                  isSelectedMovable ? 'cursor-pointer hover:scale-105' : 'pointer-events-none'
                }`}
              >
                <div
                  className={`relative w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border sm:border-2 border-white shadow-md transition-transform active:scale-95 ${
                    colorCfg.tokenBg
                  } ${
                    isSelectedMovable
                      ? 'ring-2 ring-white/90 ring-offset-1 ring-offset-slate-900 shadow-[0_0_10px_rgba(255,255,255,0.9)]'
                      : ''
                  }`}
                >
                  {/* Expanded touch target for effortless tapping on mobile */}
                  {isSelectedMovable && (
                    <div className="absolute -inset-3 sm:-inset-2 rounded-full cursor-pointer -z-10" />
                  )}

                  <span className="text-[9px] sm:text-xs font-bold leading-none select-none">
                    {colorCfg.emoji}
                  </span>

                  {/* Subtle indicator dot on eligible token */}
                  {isSelectedMovable && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 border border-slate-900" />
                  )}
                </div>
              </motion.div>
            );
          });
        })()}

      </div>
    </div>
  );
};
