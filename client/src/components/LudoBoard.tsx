import React, { useEffect, useRef, useMemo } from 'react';
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
  const activeRafRef = useRef<Record<string, number>>({});
  const activeTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  // Direct DOM references for 60FPS/120FPS hardware-accelerated RAF transforms
  const tokenNodesRef = useRef<Map<string, {
    root: HTMLDivElement;
    pawn: HTMLDivElement;
    shadow: HTMLDivElement;
  }>>(new Map());

  // 1. Cleanup ONLY on component unmount (NEVER on gameState updates!)
  useEffect(() => {
    return () => {
      Object.values(activeRafRef.current).forEach(id => cancelAnimationFrame(id));
      activeRafRef.current = {};
      Object.values(activeTimersRef.current).forEach(timers => timers.forEach(t => clearTimeout(t)));
      activeTimersRef.current = {};
    };
  }, []);

  // 2. 60FPS / 120FPS Parabolic Motion Engine
  // Runs uninterrupted across gameState updates until the token arrives exactly at its target
  useEffect(() => {
    // Detect any moving attacker in this state update to sync capture strike impact
    let maxAttackerDuration = 0;
    gameState.players.forEach(p => {
      p.tokens.forEach(t => {
        const k = `${p.color}-${t.id}`;
        const prev = prevProgressRef.current[k];
        if (prev !== undefined && t.progress > prev && prev >= 0) {
          const steps = t.progress - prev;
          const dur = steps * 125;
          if (dur > maxAttackerDuration) maxAttackerDuration = dur;
        }
      });
    });

    gameState.players.forEach(player => {
      player.tokens.forEach(token => {
        const key = `${player.color}-${token.id}`;
        const prevProg = prevProgressRef.current[key];
        const targetProg = token.progress;

        // On first mount, record position without playing animations
        if (prevProg === undefined) {
          prevProgressRef.current[key] = targetProg;
          const el = tokenNodesRef.current.get(key);
          if (el) {
            const initialCoord = getCoordForProgress(player.color, targetProg, token.id);
            el.root.style.transform = `translate3d(${initialCoord.c * 100}%, ${initialCoord.r * 100}%, 0)`;
            el.pawn.style.transform = `translate3d(0px, 0px, 0) scale(1) rotate(-${boardRotation}deg)`;
          }
          return;
        }

        // If progress didn't change:
        // If this token is NOT currently mid-animation, ensure it is firmly snapped to its authoritative position!
        if (prevProg === targetProg) {
          if (!activeRafRef.current[key]) {
            const el = tokenNodesRef.current.get(key);
            if (el) {
              const currentCoord = getCoordForProgress(player.color, targetProg, token.id);
              el.root.style.transform = `translate3d(${currentCoord.c * 100}%, ${currentCoord.r * 100}%, 0)`;
              el.pawn.style.transform = `translate3d(0px, 0px, 0) scale(1) rotate(-${boardRotation}deg)`;
              el.shadow.style.transform = 'scale(1)';
              el.shadow.style.opacity = '0.65';
            }
          }
          return;
        }

        // Progress changed -> update stored progress
        prevProgressRef.current[key] = targetProg;

        // Cancel previous animation for THIS specific token only
        if (activeRafRef.current[key]) {
          cancelAnimationFrame(activeRafRef.current[key]);
          delete activeRafRef.current[key];
        }

        if (activeTimersRef.current[key]) {
          activeTimersRef.current[key].forEach(t => clearTimeout(t));
          activeTimersRef.current[key] = [];
        } else {
          activeTimersRef.current[key] = [];
        }

        const node = tokenNodesRef.current.get(key);

        // CASE A: Forward walking (Silky-smooth continuous parabolic hopping at 60/120 FPS)
        if (targetProg > prevProg && prevProg >= 0) {
          const waypoints: GridCoord[] = [];
          for (let p = prevProg; p <= targetProg; p++) {
            waypoints.push(getCoordForProgress(player.color, p, token.id));
          }

          const stepsCount = waypoints.length - 1;
          const hopDuration = 125;
          const totalDuration = stepsCount * hopDuration;
          const startTime = performance.now();
          let lastStepSound = 0;

          const animateForward = (now: number) => {
            const currentEl = tokenNodesRef.current.get(key);
            if (!currentEl) {
              delete activeRafRef.current[key];
              return;
            }

            const elapsed = now - startTime;
            const progressRatio = Math.min(1.0, elapsed / totalDuration);
            const totalHopProgress = progressRatio * stepsCount;
            const currentHop = Math.min(stepsCount - 1, Math.floor(totalHopProgress));
            const subT = totalHopProgress - currentHop;

            const from = waypoints[currentHop];
            const to = waypoints[currentHop + 1];

            const c = from.c + (to.c - from.c) * subT;
            const r = from.r + (to.r - from.r) * subT;

            // Parabolic vertical jump arc (13px peak at subT = 0.5)
            const arc = 4 * subT * (1 - subT);
            const hopY = arc * 13;

            // Touchdown sound trigger
            if (currentHop + 1 > lastStepSound && subT >= 0.85) {
              lastStepSound = currentHop + 1;
              sounds.playTokenStep(lastStepSound);
            }

            currentEl.root.style.transform = `translate3d(${c * 100}%, ${r * 100}%, 0)`;
            currentEl.pawn.style.transform = `translate3d(0px, ${-hopY}px, 0) scale(${1 + arc * 0.12}) rotate(-${boardRotation}deg)`;
            currentEl.shadow.style.transform = `scale(${1 - arc * 0.28})`;
            currentEl.shadow.style.opacity = `${0.65 - arc * 0.35}`;

            if (progressRatio < 1.0) {
              activeRafRef.current[key] = requestAnimationFrame(animateForward);
            } else {
              delete activeRafRef.current[key];
              const finalCoord = waypoints[waypoints.length - 1];
              currentEl.root.style.transform = `translate3d(${finalCoord.c * 100}%, ${finalCoord.r * 100}%, 0)`;
              currentEl.pawn.style.transform = `translate3d(0px, 0px, 0) scale(1) rotate(-${boardRotation}deg)`;
              currentEl.shadow.style.transform = 'scale(1)';
              currentEl.shadow.style.opacity = '0.65';

              if (targetProg === 56) {
                sounds.playHomeArrival();
              } else if (targetProg >= 0 && targetProg <= 50) {
                const startIndices = { rose: 0, lavender: 13, peach: 26, mint: 39 };
                const tileIdx = ((startIndices[player.color] ?? 0) + targetProg) % 52;
                if ([0, 8, 13, 21, 26, 34, 39, 47].includes(tileIdx)) {
                  sounds.playSafeLanding();
                }
              }
            }
          };

          activeRafRef.current[key] = requestAnimationFrame(animateForward);
        }
        // CASE B: Spawn from Base onto Track (-1 -> 0)
        else if (targetProg === 0 && prevProg === -1) {
          sounds.playTokenSpawn();
          const from = getCoordForProgress(player.color, -1, token.id);
          const to = getCoordForProgress(player.color, 0, token.id);
          const spawnDuration = 220;
          const startTime = performance.now();

          const animateSpawn = (now: number) => {
            const currentEl = tokenNodesRef.current.get(key);
            if (!currentEl) {
              delete activeRafRef.current[key];
              return;
            }

            const elapsed = now - startTime;
            const t = Math.min(1.0, elapsed / spawnDuration);
            const c = from.c + (to.c - from.c) * t;
            const r = from.r + (to.r - from.r) * t;
            const arc = 4 * t * (1 - t);
            const hopY = arc * 16;

            currentEl.root.style.transform = `translate3d(${c * 100}%, ${r * 100}%, 0)`;
            currentEl.pawn.style.transform = `translate3d(0px, ${-hopY}px, 0) scale(${1 + arc * 0.2}) rotate(-${boardRotation}deg)`;

            if (t < 1.0) {
              activeRafRef.current[key] = requestAnimationFrame(animateSpawn);
            } else {
              delete activeRafRef.current[key];
              currentEl.root.style.transform = `translate3d(${to.c * 100}%, ${to.r * 100}%, 0)`;
              currentEl.pawn.style.transform = `translate3d(0px, 0px, 0) scale(1) rotate(-${boardRotation}deg)`;
            }
          };

          activeRafRef.current[key] = requestAnimationFrame(animateSpawn);
        }
        // CASE C: Captured / Killed (Holds for attacker strike -> Rewinds smoothly back to base slot)
        else if (targetProg === -1 && prevProg >= 0) {
          const impactDelay = maxAttackerDuration > 0 ? maxAttackerDuration : 0;

          // Reverse waypoints from prevProg back to 0, then directly into -1 (base slot)
          const waypoints: GridCoord[] = [];
          for (let p = prevProg; p >= 0; p--) {
            waypoints.push(getCoordForProgress(player.color, p, token.id));
          }
          waypoints.push(getCoordForProgress(player.color, -1, token.id));

          const stepsCount = waypoints.length - 1;
          const rewindStepDuration = Math.max(18, Math.min(28, Math.floor(400 / stepsCount)));
          const totalRewindDuration = stepsCount * rewindStepDuration;

          // Hold victim at strike location until attacker lands
          const victimCoord = getCoordForProgress(player.color, prevProg, token.id);
          if (node) {
            node.root.style.transform = `translate3d(${victimCoord.c * 100}%, ${victimCoord.r * 100}%, 0)`;
          }

          const impactTimer = setTimeout(() => {
            sounds.playCapturePop();
            sounds.playRewindStep();

            const startTime = performance.now();
            const animateRewind = (now: number) => {
              const currentEl = tokenNodesRef.current.get(key);
              if (!currentEl) {
                delete activeRafRef.current[key];
                return;
              }

              const elapsed = now - startTime;
              const progressRatio = Math.min(1.0, elapsed / totalRewindDuration);
              const totalHop = progressRatio * stepsCount;
              const currentHop = Math.min(stepsCount - 1, Math.floor(totalHop));
              const subT = totalHop - currentHop;

              const from = waypoints[currentHop];
              const to = waypoints[currentHop + 1];

              const c = from.c + (to.c - from.c) * subT;
              const r = from.r + (to.r - from.r) * subT;
              const spinDeg = -boardRotation - (progressRatio * 360);

              currentEl.root.style.transform = `translate3d(${c * 100}%, ${r * 100}%, 0)`;
              currentEl.pawn.style.transform = `translate3d(0px, 0px, 0) scale(0.95) rotate(${spinDeg}deg)`;

              if (progressRatio < 1.0) {
                activeRafRef.current[key] = requestAnimationFrame(animateRewind);
              } else {
                delete activeRafRef.current[key];
                const finalCoord = waypoints[waypoints.length - 1];
                currentEl.root.style.transform = `translate3d(${finalCoord.c * 100}%, ${finalCoord.r * 100}%, 0)`;
                currentEl.pawn.style.transform = `translate3d(0px, 0px, 0) scale(1) rotate(-${boardRotation}deg)`;
              }
            };

            activeRafRef.current[key] = requestAnimationFrame(animateRewind);
          }, impactDelay);

          activeTimersRef.current[key].push(impactTimer);
        }
      });
    });
  }, [gameState, boardRotation]);

  // Map every token to its current grid row & col coordinate
  const placedTokens: Array<{
    playerColor: PlayerColor;
    playerId: string;
    token: Token;
    coord: GridCoord;
    isMovable: boolean;
  }> = [];

  gameState.players.forEach(player => {
    player.tokens.forEach((token) => {
      const coord = getCoordForProgress(player.color, token.progress, token.id);
      const isMovable = isMyTurn && player.id === myPlayerId && movableTokenIds.includes(token.id);

      placedTokens.push({
        playerColor: player.color,
        playerId: player.id,
        token,
        coord,
        isMovable
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
  // gap-0 ensures 100% pixel-perfect alignment between grid cells and absolute tokens!
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
          <div className="w-[82%] h-[82%] rounded-2xl bg-white/[0.08] border border-rose-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* 2. Base Corner: Lavender (Top-Right, 0..5, 9..14) */}
        <div className={`relative col-start-10 col-span-6 row-start-1 row-span-6 rounded-2xl bg-gradient-to-br from-purple-950/90 via-indigo-900/60 to-purple-900/40 p-2 sm:p-2.5 border-2 border-purple-500/50 flex items-center justify-center shadow-lg ${
          !lavenderPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[82%] h-[82%] rounded-2xl bg-white/[0.08] border border-purple-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* 3. Base Corner: Peach (Bottom-Right, 9..14, 9..14) */}
        <div className={`relative col-start-10 col-span-6 row-start-10 row-span-6 rounded-2xl bg-gradient-to-br from-amber-950/90 via-orange-900/60 to-amber-900/40 p-2 sm:p-2.5 border-2 border-amber-500/50 flex items-center justify-center shadow-lg ${
          !peachPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[82%] h-[82%] rounded-2xl bg-white/[0.08] border border-amber-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
        </div>

        {/* 4. Base Corner: Mint (Bottom-Left, 9..14, 0..5) */}
        <div className={`relative col-start-1 col-span-6 row-start-10 row-span-6 rounded-2xl bg-gradient-to-br from-teal-950/90 via-emerald-900/60 to-teal-900/40 p-2 sm:p-2.5 border-2 border-teal-500/50 flex items-center justify-center shadow-lg ${
          !mintPlayer ? 'opacity-30' : ''
        }`}>
          <div className="w-[82%] h-[82%] rounded-2xl bg-white/[0.08] border border-teal-400/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center" />
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

  // Group tokens by coordinate on the track (never in the yard!)
  const cellTokensMap = useMemo(() => {
    const map = new Map<string, typeof placedTokens>();
    placedTokens.forEach((t) => {
      // In base yard (progress === -1), tokens have their own independent slots and do NOT cluster
      if (t.token.progress === -1) return;
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
      {/* 15x15 Board Grid (gap-0 ensures zero mathematical drift between grid cells & absolute tokens) */}
      <div
        className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-0 bg-slate-950/80 p-1 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden"
        style={{
          transform: `rotate(${boardRotation}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Memoized static board cells - zero diffing cost during movement */}
        {staticBoardGrid}

        {/* 60FPS / 120FPS Direct RAF Hardware-Accelerated Pawn Layer */}
        <div className="absolute inset-1 pointer-events-none z-30">
          {placedTokens.map((item) => {
            const key = `${item.playerColor}-${item.token.id}`;
            const colorCfg = COLOR_STYLES[item.playerColor];
            const isSelectedMovable = item.isMovable;
            const isBase = item.token.progress === -1;

            const cellKey = `${item.coord.r}-${item.coord.c}`;
            const cellGroup = isBase ? [item] : (cellTokensMap.get(cellKey) || [item]);
            const clusterCount = cellGroup.length;
            const clusterIndex = cellGroup.indexOf(item);

            let clusterX = 0;
            let clusterY = 0;
            let clusterScale = 1;

            if (!isBase) {
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
            }

            return (
              <div
                key={`token-${item.playerColor}-${item.token.id}`}
                ref={(el) => {
                  if (el) {
                    tokenNodesRef.current.set(key, {
                      root: el,
                      pawn: el.querySelector('.pawn-body') as HTMLDivElement,
                      shadow: el.querySelector('.pawn-shadow') as HTMLDivElement
                    });
                  } else {
                    tokenNodesRef.current.delete(key);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '6.6667%',
                  height: '6.6667%',
                  transform: `translate3d(${item.coord.c * 100}%, ${item.coord.r * 100}%, 0)`,
                  willChange: 'transform'
                }}
                className={`flex items-center justify-center ${
                  isSelectedMovable ? 'z-40 pointer-events-auto' : 'z-30 pointer-events-none'
                }`}
              >
                {/* Inner Tactile Pawn: Hardware Accelerated Transform Arc */}
                <div
                  className={`pawn-body relative flex items-center justify-center ${
                    isSelectedMovable ? 'cursor-pointer' : ''
                  }`}
                  style={{
                    transform: `translate3d(${clusterX}px, ${clusterY}px, 0) scale(${
                      isSelectedMovable ? clusterScale * 1.08 : clusterScale
                    }) rotate(-${boardRotation}deg)`,
                    willChange: 'transform'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSelectedMovable) {
                      sounds.playTokenStep();
                      onSelectToken(item.token.id);
                    }
                  }}
                >
                  {/* Dynamic 3D Ground Drop Shadow */}
                  <div
                    className="pawn-shadow absolute -bottom-1 w-5 h-1.5 sm:w-6 sm:h-2 rounded-full bg-black/60 pointer-events-none"
                    style={{
                      transform: 'scale(1)',
                      opacity: 0.65,
                      willChange: 'transform, opacity'
                    }}
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
