import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  userColor?: PlayerColor;
  onSelectToken: (tokenId: number) => void;
  onScreenTouch?: (x: number, y: number) => void;
  homeChatBubbles?: Record<string, { text: string; timestamp: number } | null>;
  turnTimePercent?: number;
}

// Rotation angles so the local player's yard is ALWAYS anchored at Bottom-Left (matching Ludo King)
const COLOR_ROTATION_DEG: Record<PlayerColor, number> = {
  mint: 0,
  peach: 90,
  lavender: 180,
  rose: 270
};

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
  userColor = 'mint',
  onSelectToken,
  onScreenTouch
}) => {
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const movableTokenIds = isMyTurn ? (gameState.movableTokenIds || []) : [];

  const rosePlayer = gameState.players.find(p => p.color === 'rose');
  const lavenderPlayer = gameState.players.find(p => p.color === 'lavender');
  const peachPlayer = gameState.players.find(p => p.color === 'peach');
  const mintPlayer = gameState.players.find(p => p.color === 'mint');

  const boardRotation = COLOR_ROTATION_DEG[userColor] || 0;

  // Track previous progress and independent per-token animation states
  const prevProgressRef = useRef<Record<string, number>>({});
  const [animTokens, setAnimTokens] = useState<Record<string, { step: number; isRewind?: boolean }>>({});
  const tokenTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  // 60FPS Hardware-Accelerated Motion Engine: forward stepping + delayed sequential kill rewind
  useEffect(() => {
    // 1. Detect any moving attacker in this state update to sync capture strike impact
    let maxAttackerDuration = 0;
    gameState.players.forEach(p => {
      p.tokens.forEach(t => {
        const k = `${p.color}-${t.id}`;
        const prev = prevProgressRef.current[k];
        if (prev !== undefined && t.progress > prev && prev >= 0) {
          const steps = t.progress - prev;
          const dur = steps * 118;
          if (dur > maxAttackerDuration) maxAttackerDuration = dur;
        }
      });
    });

    // 2. Animate tokens
    gameState.players.forEach(player => {
      player.tokens.forEach(token => {
        const key = `${player.color}-${token.id}`;
        const prevProg = prevProgressRef.current[key];
        const targetProg = token.progress;

        // If progress didn't change, do not disturb ongoing animations
        if (prevProg === targetProg) return;

        // Progress changed -> update stored progress
        prevProgressRef.current[key] = targetProg;

        // Clear only this token's previous running timers
        if (tokenTimersRef.current[key]) {
          tokenTimersRef.current[key].forEach(t => clearTimeout(t));
          tokenTimersRef.current[key] = [];
        }

        const timers: ReturnType<typeof setTimeout>[] = [];
        tokenTimersRef.current[key] = timers;

        if (prevProg !== undefined && targetProg > prevProg && prevProg >= 0) {
          // Walking forward step-by-step (silky-smooth 118ms pace with GPU acceleration)
          const stepsCount = targetProg - prevProg;
          const stepSpeed = 118;

          for (let step = 1; step <= stepsCount; step++) {
            const nextVal = prevProg + step;
            const timer = setTimeout(() => {
              setAnimTokens(prev => ({
                ...prev,
                [key]: { step: nextVal, isRewind: false }
              }));
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
                setTimeout(() => {
                  setAnimTokens(prev => {
                    const copy = { ...prev };
                    delete copy[key];
                    return copy;
                  });
                }, 90);
              }
            }, (step - 1) * stepSpeed);
            timers.push(timer);
          }
        } else if (prevProg !== undefined && targetProg === 0 && prevProg === -1) {
          // Token spawned from base onto track
          sounds.playTokenSpawn();
        } else if (prevProg !== undefined && targetProg === -1 && prevProg >= 0) {
          // Token captured / killed:
          // Wait for attacker to land -> play capture pop -> rewind backwards step-by-step to home slot
          const impactDelay = maxAttackerDuration > 0 ? maxAttackerDuration : 0;
          const rewindStepsCount = prevProg + 1; // from prevProg down to -1
          const rewindSpeed = Math.max(20, Math.min(30, Math.floor(400 / rewindStepsCount)));

          // Hold the victim token at its killed position until attacker arrives
          setAnimTokens(prev => ({
            ...prev,
            [key]: { step: prevProg, isRewind: false }
          }));

          const impactTimer = setTimeout(() => {
            // Strike impact sound
            sounds.playCapturePop();

            // Rewind backwards step-by-step along the exact path it came
            for (let s = 1; s <= rewindStepsCount; s++) {
              const rewindVal = (s === rewindStepsCount) ? -1 : (prevProg - s);
              const stepTimer = setTimeout(() => {
                setAnimTokens(prev => ({
                  ...prev,
                  [key]: { step: rewindVal, isRewind: true }
                }));
                sounds.playRewindStep();

                if (s === rewindStepsCount) {
                  // Settled back into base home slot
                  setTimeout(() => {
                    setAnimTokens(prev => {
                      const copy = { ...prev };
                      delete copy[key];
                      return copy;
                    });
                  }, 100);
                }
              }, (s - 1) * rewindSpeed);
              timers.push(stepTimer);
            }
          }, impactDelay);
          timers.push(impactTimer);
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
      const anim = animTokens[key];
      const currentProg = anim !== undefined ? anim.step : token.progress;
      const coord = getCoordForProgress(player.color, currentProg, token.id);

      const isMovable = isMyTurn && player.id === myPlayerId && movableTokenIds.includes(token.id);
      const isHopping = anim !== undefined && !anim.isRewind;
      const isRewinding = anim !== undefined && !!anim.isRewind;

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

  // 100% MEMOIZED STATIC BOARD GRID:
  // 225 track cells, 4 corner yard bases, center triangles SVG, and 16 base slots.
  // This NEVER re-renders during token hops, giving 0-lag 60fps on low-end mobile devices!
  const staticBoardGrid = useMemo(() => {
    const getSpecialCellContent = (r: number, c: number) => {
      const mainIndex = MAIN_TRACK_COORDS.findIndex(item => item.r === r && item.c === c);
      if (mainIndex === -1) return null;

      // 1. Starting Squares
      if (STARTING_TILES[mainIndex]) {
        const startInfo = STARTING_TILES[mainIndex];
        return (
          <div
            style={{ transform: `rotate(${-boardRotation}deg)` }}
            className="w-full h-full flex flex-col items-center justify-center pointer-events-none select-none leading-none gap-0.5"
          >
            <span className="text-[10px] sm:text-xs text-white font-black filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              {startInfo.arrow}
            </span>
            <span className="text-[6.5px] sm:text-[8px] font-black uppercase tracking-tighter text-white/90">
              {startInfo.dirLabel}
            </span>
          </div>
        );
      }

      // 2. Safe Stumps (Indices 8, 21, 34, 47)
      if (SAFE_STUMP_INDICES.includes(mainIndex)) {
        return (
          <div
            style={{ transform: `rotate(${-boardRotation}deg)` }}
            className="w-full h-full flex items-center justify-center pointer-events-none select-none relative p-0.5"
          >
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
      <>
        {/* 1. Base Corner: Rose (Top-Left, 0..5, 0..5) */}
        <div className={`relative col-start-1 col-span-6 row-start-1 row-span-6 rounded-2xl bg-gradient-to-br from-rose-950/90 via-pink-900/60 to-rose-900/40 p-2 sm:p-2.5 border-2 border-rose-500/50 flex items-center justify-center shadow-lg ${
          !rosePlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[80%] h-[80%] rounded-2xl bg-white/[0.08] border border-rose-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* 2. Base Corner: Lavender (Top-Right, 0..5, 9..14) */}
        <div className={`relative col-start-10 col-span-6 row-start-1 row-span-6 rounded-2xl bg-gradient-to-br from-purple-950/90 via-indigo-900/60 to-purple-900/40 p-2 sm:p-2.5 border-2 border-purple-500/50 flex items-center justify-center shadow-lg ${
          !lavenderPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[80%] h-[80%] rounded-2xl bg-white/[0.08] border border-purple-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* 3. Base Corner: Peach (Bottom-Right, 9..14, 9..14) */}
        <div className={`relative col-start-10 col-span-6 row-start-10 row-span-6 rounded-2xl bg-gradient-to-br from-amber-950/90 via-orange-900/60 to-amber-900/40 p-2 sm:p-2.5 border-2 border-amber-500/50 flex items-center justify-center shadow-lg ${
          !peachPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[80%] h-[80%] rounded-2xl bg-white/[0.08] border border-amber-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* 4. Base Corner: Mint (Bottom-Left, 9..14, 0..5) */}
        <div className={`relative col-start-1 col-span-6 row-start-10 row-span-6 rounded-2xl bg-gradient-to-br from-teal-950/90 via-emerald-900/60 to-teal-900/40 p-2 sm:p-2.5 border-2 border-teal-500/50 flex items-center justify-center shadow-lg ${
          !mintPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[80%] h-[80%] rounded-2xl bg-white/[0.08] border border-teal-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* Center: Traditional 4-Triangle Ludo Home (rows 6..8, cols 6..8) */}
        <div className="col-start-7 col-span-3 row-start-7 row-span-3 rounded-xl bg-slate-900 border border-white/20 relative overflow-hidden flex items-center justify-center shadow-inner">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <polygon points="0,0 100,0 50,50" fill="#a855f7" fillOpacity="0.55" stroke="#a855f7" strokeWidth="0.5" />
            <polygon points="100,0 100,100 50,50" fill="#fb923c" fillOpacity="0.55" stroke="#fb923c" strokeWidth="0.5" />
            <polygon points="100,100 0,100 50,50" fill="#2dd4bf" fillOpacity="0.55" stroke="#2dd4bf" strokeWidth="0.5" />
            <polygon points="0,100 0,0 50,50" fill="#f43f5e" fillOpacity="0.55" stroke="#f43f5e" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="13" fill="#090d16" stroke="#ffffff" strokeWidth="1.2" />
            <text
              x="50"
              y="55"
              fontSize="13"
              textAnchor="middle"
              fill="#facc15"
              dominantBaseline="middle"
              transform={`rotate(${-boardRotation} 50 50)`}
            >
              ⭐
            </text>
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

            const mainIndex = MAIN_TRACK_COORDS.findIndex(item => item.r === r && item.c === c);
            let cellBg = 'bg-white/[0.05]';

            if (mainIndex === 0) {
              cellBg = 'bg-gradient-to-br from-rose-600/80 via-rose-700/70 to-pink-800/70 border-2 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]';
            } else if (mainIndex === 13) {
              cellBg = 'bg-gradient-to-br from-purple-600/80 via-purple-700/70 to-indigo-800/70 border-2 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]';
            } else if (mainIndex === 26) {
              cellBg = 'bg-gradient-to-br from-amber-600/80 via-orange-700/70 to-amber-800/70 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,146,60,0.4)]';
            } else if (mainIndex === 39) {
              cellBg = 'bg-gradient-to-br from-teal-600/80 via-emerald-700/70 to-teal-800/70 border-2 border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.4)]';
            } else if (SAFE_STUMP_INDICES.includes(mainIndex)) {
              cellBg = 'bg-gradient-to-br from-amber-950/80 via-slate-900/95 to-yellow-950/70 border-2 border-amber-400/80 shadow-[inset_0_0_8px_rgba(251,191,36,0.35),0_0_10px_rgba(245,158,11,0.35)]';
            } else if (runwayColor === 'rose') cellBg = 'bg-rose-500/40 border-rose-400/40';
            else if (runwayColor === 'lavender') cellBg = 'bg-purple-500/40 border-purple-400/40';
            else if (runwayColor === 'peach') cellBg = 'bg-amber-500/40 border-amber-400/40';
            else if (runwayColor === 'mint') cellBg = 'bg-teal-500/40 border-teal-400/40';

            return (
              <div
                key={`cell-${r}-${c}`}
                style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
                className={`relative rounded flex items-center justify-center border border-white/[0.08] ${cellBg}`}
              >
                {specialContent}
              </div>
            );
          })
        )}

        {/* Base Sunken Token Slot Circles */}
        {(['rose', 'lavender', 'peach', 'mint'] as PlayerColor[]).map((col) => {
          const player = col === 'rose' ? rosePlayer : col === 'lavender' ? lavenderPlayer : col === 'peach' ? peachPlayer : mintPlayer;
          const slots = BASE_SLOTS_COORDS[col];
          const slotStyles = {
            rose: {
              border: 'border-rose-400/70',
              bg: 'bg-rose-950/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_10px_rgba(244,63,94,0.25)]',
              dot: 'bg-rose-400/70 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            },
            lavender: {
              border: 'border-purple-400/70',
              bg: 'bg-purple-950/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_10px_rgba(168,85,247,0.25)]',
              dot: 'bg-purple-400/70 shadow-[0_0_8px_rgba(168,85,247,0.8)]'
            },
            peach: {
              border: 'border-amber-400/70',
              bg: 'bg-amber-950/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_10px_rgba(251,146,60,0.25)]',
              dot: 'bg-amber-400/70 shadow-[0_0_8px_rgba(251,146,60,0.8)]'
            },
            mint: {
              border: 'border-teal-400/70',
              bg: 'bg-teal-950/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_10px_rgba(45,212,191,0.25)]',
              dot: 'bg-teal-400/70 shadow-[0_0_8px_rgba(45,212,191,0.8)]'
            }
          }[col];

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
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 ${slotStyles.border} ${slotStyles.bg} flex items-center justify-center`}>
                <div className={`w-2 h-2 rounded-full ${slotStyles.dot}`} />
              </div>
            </div>
          ));
        })}
      </>
    );
  }, [boardRotation, !!rosePlayer, !!lavenderPlayer, !!peachPlayer, !!mintPlayer]);

  // Group tokens by coordinate so multiple tokens on the same tile/stump cluster neatly
  const cellTokensMap = useMemo(() => {
    const map = new Map<string, typeof placedTokens>();
    placedTokens.forEach((t) => {
      const cellKey = `${t.coord.r}-${t.coord.c}`;
      if (!map.has(cellKey)) {
        map.set(cellKey, []);
      }
      map.get(cellKey)!.push(t);
    });
    return map;
  }, [placedTokens]);

  return (
    <div
      onClick={handleBoardClick}
      className="relative w-full max-w-[min(96vw,500px)] aspect-square mx-auto p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl glass-panel shadow-[0_12px_45px_rgba(0,0,0,0.6)] border border-white/20 select-none touch-manipulation"
    >
      {/* 15x15 Board Grid - Rotated so user's yard is ALWAYS at Bottom-Left */}
      <div
        className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] sm:gap-[2px] bg-slate-950/80 p-1 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden"
        style={{
          transform: `rotate(${boardRotation}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Memoized static board cells - zero diffing cost during movement */}
        {staticBoardGrid}

        {/* 60FPS Pure Hardware-Accelerated Pawn Layer (GPU translate3d off the JS thread) */}
        <div className="absolute inset-1 pointer-events-none z-30">
          {placedTokens.map((item) => {
            const colorCfg = COLOR_STYLES[item.playerColor];
            const isSelectedMovable = item.isMovable;
            const isHopping = item.isHopping;
            const isRewinding = item.isRewinding;

            const cellKey = `${item.coord.r}-${item.coord.c}`;
            const cellGroup = cellTokensMap.get(cellKey) || [item];
            const clusterCount = cellGroup.length;
            const clusterIndex = cellGroup.indexOf(item);

            let clusterX = 0;
            let clusterY = 0;
            let clusterScale = 1;

            if (clusterCount === 2) {
              clusterScale = 0.82;
              clusterX = clusterIndex === 0 ? -6 : 6;
              clusterY = 0;
            } else if (clusterCount === 3) {
              clusterScale = 0.72;
              if (clusterIndex === 0) {
                clusterX = -6;
                clusterY = -5;
              } else if (clusterIndex === 1) {
                clusterX = 6;
                clusterY = -5;
              } else {
                clusterX = 0;
                clusterY = 5;
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

            // Outer wrapper translates smoothly along the 15x15 board coordinates on the GPU
            return (
              <div
                key={`token-${item.playerColor}-${item.token.id}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '6.6667%',
                  height: '6.6667%',
                  transform: `translate3d(${item.coord.c * 100}%, ${item.coord.r * 100}%, 0)`,
                  transition: isRewinding
                    ? 'transform 26ms linear'
                    : isHopping
                    ? 'transform 118ms cubic-bezier(0.25, 0.1, 0.25, 1)'
                    : 'transform 180ms ease-out',
                  willChange: 'transform'
                }}
                className={`flex items-center justify-center ${
                  isSelectedMovable ? 'z-40 pointer-events-auto' : 'z-30 pointer-events-none'
                }`}
              >
                {/* Inner Tactile Pawn: Parabolic Bounce Arc + Drop Shadow + Counter-Rotation */}
                <div
                  style={{
                    transform: `translate3d(${clusterX}px, ${isHopping ? -9 : clusterY}px, 0) scale(${
                      isSelectedMovable ? clusterScale * 1.08 : clusterScale
                    }) rotate(${isRewinding ? -boardRotation - 360 : -boardRotation}deg)`,
                    transition: isHopping
                      ? 'transform 118ms cubic-bezier(0.33, 1, 0.68, 1)'
                      : 'transform 180ms ease-out',
                    willChange: 'transform'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelectedMovable) {
                      sounds.playTokenStep();
                      onSelectToken(item.token.id);
                    }
                  }}
                  className={`relative flex items-center justify-center ${
                    isSelectedMovable ? 'cursor-pointer' : ''
                  }`}
                >
                  {/* Dynamic 3D Ground Drop Shadow */}
                  <div
                    className={`absolute -bottom-1 w-5 h-1.5 sm:w-6 sm:h-2 rounded-full bg-black/60 pointer-events-none transition-transform duration-100 ${
                      isHopping ? 'scale-75 opacity-30 -translate-y-1' : 'scale-100 opacity-70'
                    }`}
                  />

                  {/* Glossy Beveled Token Pawn */}
                  <div
                    className={`relative w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border sm:border-2 border-white shadow-md active:scale-95 ${
                      colorCfg.tokenBg
                    } ${
                      isSelectedMovable
                        ? 'ring-2 ring-white/95 ring-offset-1 ring-offset-slate-900 shadow-[0_0_14px_rgba(255,255,255,0.95)] animate-pulse'
                        : ''
                    }`}
                  >
                    {/* Touch Target Expander for Mobile Ease */}
                    {isSelectedMovable && (
                      <div className="absolute -inset-3 sm:-inset-2 rounded-full cursor-pointer -z-10" />
                    )}

                    <span className="text-[9px] sm:text-xs font-bold leading-none select-none">
                      {colorCfg.emoji}
                    </span>

                    {/* Moving pulse indicator dot */}
                    {isSelectedMovable && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 border border-slate-900 animate-ping" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
