import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { BorderTimer } from './BorderTimer';

interface LudoBoardProps {
  gameState: GameState;
  myPlayerId: string;
  onSelectToken: (tokenId: number) => void;
  onScreenTouch?: (x: number, y: number) => void;
  homeChatBubbles?: Record<string, { text: string; timestamp: number } | null>;
  turnTimePercent?: number;
}

// Traditional 8 safe positions on the 52-tile track
const TRADITIONAL_SAFE_TILES = [0, 8, 13, 21, 26, 34, 39, 47];

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
  const [hoppingToken, setHoppingToken] = useState<{ key: string; step: number } | null>(null);
  const activeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Step-by-step walking animation runner
  useEffect(() => {
    // Clear any previous running timers
    activeTimersRef.current.forEach(t => clearTimeout(t));
    activeTimersRef.current = [];

    gameState.players.forEach(player => {
      player.tokens.forEach(token => {
        const key = `${player.color}-${token.id}`;
        const prevProg = prevProgressRef.current[key];
        const targetProg = token.progress;

        // Remember current progress for next transition
        prevProgressRef.current[key] = targetProg;

        if (prevProg !== undefined && targetProg > prevProg && prevProg >= 0) {
          // Walking forward step-by-step
          const stepsCount = targetProg - prevProg;
          for (let step = 1; step <= stepsCount; step++) {
            const nextVal = prevProg + step;
            const timer = setTimeout(() => {
              setHoppingToken({ key, step: nextVal });
              sounds.playTokenStep(step);

              if (step === stepsCount) {
                setTimeout(() => setHoppingToken(null), 180);
              }
            }, (step - 1) * 150);
            activeTimersRef.current.push(timer);
          }
        } else if (prevProg !== undefined && targetProg === 0 && prevProg === -1) {
          // Token spawned from base onto track
          sounds.playTokenStep();
        } else if (prevProg !== undefined && targetProg === -1 && prevProg >= 0) {
          // Token captured back to base
          sounds.playCapturePop();
        }
      });
    });

    return () => {
      activeTimersRef.current.forEach(t => clearTimeout(t));
    };
  }, [gameState]);

  // Map every token to its current grid row & col coordinate based on animated progress
  const placedTokens: Array<{
    playerColor: PlayerColor;
    playerId: string;
    token: Token;
    coord: GridCoord;
    isMovable: boolean;
    isHopping: boolean;
  }> = [];

  gameState.players.forEach(player => {
    player.tokens.forEach((token) => {
      const key = `${player.color}-${token.id}`;
      // When actively hopping, use the animated step; otherwise ALWAYS use the authoritative token.progress
      const currentProg = (hoppingToken && hoppingToken.key === key)
        ? hoppingToken.step
        : token.progress;
      const coord = getCoordForProgress(player.color, currentProg, token.id);

      const isMovable = isMyTurn && player.id === myPlayerId && movableTokenIds.includes(token.id);
      const isHopping = hoppingToken?.key === key;

      placedTokens.push({
        playerColor: player.color,
        playerId: player.id,
        token,
        coord,
        isMovable,
        isHopping
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

  // Traditional Ludo Star Icons on safe spots
  const getSpecialCellContent = (r: number, c: number) => {
    const mainIndex = MAIN_TRACK_COORDS.findIndex(item => item.r === r && item.c === c);
    if (mainIndex !== -1 && TRADITIONAL_SAFE_TILES.includes(mainIndex)) {
      return (
        <span className="text-yellow-400 text-xs sm:text-sm font-black filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] select-none">
          ⭐
        </span>
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
        <div className="relative col-start-1 col-span-6 row-start-1 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-rose-950/90 via-pink-900/70 to-rose-900/50 p-1.5 sm:p-2 border border-rose-500/40 flex flex-col justify-between">
          {rosePlayer ? (
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold px-0.5 sm:px-1 z-10">
              <div className={`relative inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg ${
                currentPlayer?.color === 'rose'
                  ? 'bg-rose-950/90 border border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
                  : 'bg-black/35 border border-white/10'
              }`}>
                {currentPlayer?.color === 'rose' && turnTimePercent !== undefined && (
                  <BorderTimer percent={turnTimePercent} rx={8} />
                )}
                <span>🔴</span>
                <span className="truncate max-w-[62px] sm:max-w-none text-rose-300 font-extrabold">
                  {rosePlayer.name}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded-full border border-rose-400/40 font-black">
                {rosePlayer.tokensHome || 0}/{gameState.targetTokensToWin}
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}

          <div className="w-full h-full flex items-center justify-center">
            <div className={`grid grid-cols-2 gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/45 border border-rose-500/30 ${
              !rosePlayer ? 'opacity-20' : ''
            }`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-rose-400/50 bg-rose-950/60 flex items-center justify-center shadow-inner" />
              ))}
            </div>
          </div>

          {/* Ludo King Speech Bubble: Rose */}
          <AnimatePresence>
            {rosePlayer && homeChatBubbles?.rose && (
              <motion.div
                key={`bubble-rose-${homeChatBubbles.rose.timestamp}`}
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute top-8 sm:top-9 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[90%] max-w-[125px] sm:max-w-[145px] filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
              >
                <div className="relative px-2.5 py-1.5 rounded-2xl bg-white text-slate-900 border-2 border-rose-500 font-black text-[10px] sm:text-xs leading-snug shadow-2xl break-words text-center">
                  <span>{homeChatBubbles.rose.text}</span>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l-2 border-t-2 border-rose-500 transform rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Base Corner: Lavender (Top-Right, 0..5, 9..14) */}
        <div className="relative col-start-10 col-span-6 row-start-1 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-950/90 via-indigo-900/70 to-purple-900/50 p-1.5 sm:p-2 border border-purple-500/40 flex flex-col justify-between">
          {lavenderPlayer ? (
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold px-0.5 sm:px-1 z-10">
              <div className={`relative inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg ${
                currentPlayer?.color === 'lavender'
                  ? 'bg-purple-950/90 border border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                  : 'bg-black/35 border border-white/10'
              }`}>
                {currentPlayer?.color === 'lavender' && turnTimePercent !== undefined && (
                  <BorderTimer percent={turnTimePercent} rx={8} />
                )}
                <span>🟣</span>
                <span className="truncate max-w-[62px] sm:max-w-none text-purple-300 font-extrabold">
                  {lavenderPlayer.name}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-full border border-purple-400/40 font-black">
                {lavenderPlayer.tokensHome || 0}/{gameState.targetTokensToWin}
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}

          <div className="w-full h-full flex items-center justify-center">
            <div className={`grid grid-cols-2 gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/45 border border-purple-500/30 ${
              !lavenderPlayer ? 'opacity-20' : ''
            }`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-purple-400/50 bg-purple-950/60 flex items-center justify-center shadow-inner" />
              ))}
            </div>
          </div>

          {/* Ludo King Speech Bubble: Lavender */}
          <AnimatePresence>
            {lavenderPlayer && homeChatBubbles?.lavender && (
              <motion.div
                key={`bubble-lavender-${homeChatBubbles.lavender.timestamp}`}
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute top-8 sm:top-9 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[90%] max-w-[125px] sm:max-w-[145px] filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
              >
                <div className="relative px-2.5 py-1.5 rounded-2xl bg-white text-slate-900 border-2 border-purple-500 font-black text-[10px] sm:text-xs leading-snug shadow-2xl break-words text-center">
                  <span>{homeChatBubbles.lavender.text}</span>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l-2 border-t-2 border-purple-500 transform rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Base Corner: Peach (Bottom-Right, 9..14, 9..14) */}
        <div className="relative col-start-10 col-span-6 row-start-10 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-950/90 via-orange-900/70 to-amber-900/50 p-1.5 sm:p-2 border border-amber-500/40 flex flex-col justify-between">
          {peachPlayer ? (
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold px-0.5 sm:px-1 z-10">
              <div className={`relative inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg ${
                currentPlayer?.color === 'peach'
                  ? 'bg-amber-950/90 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'bg-black/35 border border-white/10'
              }`}>
                {currentPlayer?.color === 'peach' && turnTimePercent !== undefined && (
                  <BorderTimer percent={turnTimePercent} rx={8} />
                )}
                <span>🟡</span>
                <span className="truncate max-w-[62px] sm:max-w-none text-amber-300 font-extrabold">
                  {peachPlayer.name}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded-full border border-amber-400/40 font-black">
                {peachPlayer.tokensHome || 0}/{gameState.targetTokensToWin}
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}

          <div className="w-full h-full flex items-center justify-center">
            <div className={`grid grid-cols-2 gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/45 border border-amber-500/30 ${
              !peachPlayer ? 'opacity-20' : ''
            }`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-amber-400/50 bg-amber-950/60 flex items-center justify-center shadow-inner" />
              ))}
            </div>
          </div>

          {/* Ludo King Speech Bubble: Peach */}
          <AnimatePresence>
            {peachPlayer && homeChatBubbles?.peach && (
              <motion.div
                key={`bubble-peach-${homeChatBubbles.peach.timestamp}`}
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute top-8 sm:top-9 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[90%] max-w-[125px] sm:max-w-[145px] filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
              >
                <div className="relative px-2.5 py-1.5 rounded-2xl bg-white text-slate-900 border-2 border-amber-500 font-black text-[10px] sm:text-xs leading-snug shadow-2xl break-words text-center">
                  <span>{homeChatBubbles.peach.text}</span>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l-2 border-t-2 border-amber-500 transform rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 4. Base Corner: Mint (Bottom-Left, 9..14, 0..5) */}
        <div className="relative col-start-1 col-span-6 row-start-10 row-span-6 rounded-lg sm:rounded-xl bg-gradient-to-br from-teal-950/90 via-emerald-900/70 to-teal-900/50 p-1.5 sm:p-2 border border-teal-500/40 flex flex-col justify-between">
          {mintPlayer ? (
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold px-0.5 sm:px-1 z-10">
              <div className={`relative inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg ${
                currentPlayer?.color === 'mint'
                  ? 'bg-teal-950/90 border border-teal-400/60 shadow-[0_0_12px_rgba(20,184,166,0.35)]'
                  : 'bg-black/35 border border-white/10'
              }`}>
                {currentPlayer?.color === 'mint' && turnTimePercent !== undefined && (
                  <BorderTimer percent={turnTimePercent} rx={8} />
                )}
                <span>🟢</span>
                <span className="truncate max-w-[62px] sm:max-w-none text-teal-300 font-extrabold">
                  {mintPlayer.name}
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] bg-teal-500/30 text-teal-200 px-1.5 py-0.5 rounded-full border border-teal-400/40 font-black">
                {mintPlayer.tokensHome || 0}/{gameState.targetTokensToWin}
              </span>
            </div>
          ) : (
            <div className="h-5" />
          )}

          <div className="w-full h-full flex items-center justify-center">
            <div className={`grid grid-cols-2 gap-2 p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-black/45 border border-teal-500/30 ${
              !mintPlayer ? 'opacity-20' : ''
            }`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-teal-400/50 bg-teal-950/60 flex items-center justify-center shadow-inner" />
              ))}
            </div>
          </div>

          {/* Ludo King Speech Bubble: Mint */}
          <AnimatePresence>
            {mintPlayer && homeChatBubbles?.mint && (
              <motion.div
                key={`bubble-mint-${homeChatBubbles.mint.timestamp}`}
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute top-8 sm:top-9 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[90%] max-w-[125px] sm:max-w-[145px] filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
              >
                <div className="relative px-2.5 py-1.5 rounded-2xl bg-white text-slate-900 border-2 border-teal-500 font-black text-[10px] sm:text-xs leading-snug shadow-2xl break-words text-center">
                  <span>{homeChatBubbles.mint.text}</span>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-l-2 border-t-2 border-teal-500 transform rotate-45" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

            // Starting squares highlight
            const mainIndex = MAIN_TRACK_COORDS.findIndex(item => item.r === r && item.c === c);
            let cellBg = 'bg-white/[0.05] hover:bg-white/[0.1]';

            if (mainIndex === 0) cellBg = 'bg-rose-600/40 border-rose-400/50';
            else if (mainIndex === 13) cellBg = 'bg-purple-600/40 border-purple-400/50';
            else if (mainIndex === 26) cellBg = 'bg-amber-600/40 border-amber-400/50';
            else if (mainIndex === 39) cellBg = 'bg-teal-600/40 border-teal-400/50';
            else if (runwayColor === 'rose') cellBg = 'bg-rose-500/40 border-rose-400/40';
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

        {/* Tokens Overlay with Smooth Step-by-Step Hopping Physics */}
        {placedTokens.map((item) => {
          const colorCfg = COLOR_STYLES[item.playerColor];
          const isSelectedMovable = item.isMovable;
          const isHopping = item.isHopping;

          return (
            <motion.div
              key={`token-${item.playerColor}-${item.token.id}`}
              layout
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              style={{
                gridRowStart: item.coord.r + 1,
                gridColumnStart: item.coord.c + 1
              }}
              animate={
                isHopping
                  ? { scale: [1, 1.25, 1], y: [0, -8, 0] }
                  : isSelectedMovable
                  ? { scale: [1, 1.08, 1], y: [0, -1.5, 0] }
                  : { scale: 1, opacity: 1, y: 0 }
              }
              onClick={(e) => {
                e.stopPropagation();
                if (isSelectedMovable) {
                  sounds.playTokenStep();
                  onSelectToken(item.token.id);
                }
              }}
              className={`z-30 w-full h-full flex items-center justify-center touch-manipulation ${
                isSelectedMovable ? 'cursor-pointer' : 'pointer-events-none'
              }`}
            >
              <div
                className={`relative w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border sm:border-2 border-white shadow-sm transition-transform active:scale-95 ${
                  colorCfg.tokenBg
                } ${
                  isSelectedMovable
                    ? 'ring-2 ring-white/90 ring-offset-1 ring-offset-slate-900 shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                    : ''
                }`}
              >
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
        })}

      </div>
    </div>
  );
};
