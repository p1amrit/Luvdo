import { PlayerColor } from '../types/game';

export interface GridCoord {
  r: number; // 0..14
  c: number; // 0..14
}

// 52 tiles on the outer loop
export const MAIN_TRACK_COORDS: GridCoord[] = [
  { r: 6, c: 1 },  // 0 - Rose Start [SAFE]
  { r: 6, c: 2 },  // 1
  { r: 6, c: 3 },  // 2
  { r: 6, c: 4 },  // 3
  { r: 6, c: 5 },  // 4 - DARE 💌
  { r: 5, c: 6 },  // 5
  { r: 4, c: 6 },  // 6
  { r: 3, c: 6 },  // 7
  { r: 2, c: 6 },  // 8 - [SAFE]
  { r: 1, c: 6 },  // 9
  { r: 0, c: 6 },  // 10 - AFFECTION ✨
  { r: 0, c: 7 },  // 11
  { r: 0, c: 8 },  // 12
  { r: 1, c: 8 },  // 13 - Lavender Start [SAFE]
  { r: 2, c: 8 },  // 14
  { r: 3, c: 8 },  // 15
  { r: 4, c: 8 },  // 16
  { r: 5, c: 8 },  // 17 - DARE 💌
  { r: 6, c: 9 },  // 18
  { r: 6, c: 10 }, // 19
  { r: 6, c: 11 }, // 20
  { r: 6, c: 12 }, // 21 - [SAFE]
  { r: 6, c: 13 }, // 22
  { r: 6, c: 14 }, // 23 - AFFECTION ✨
  { r: 7, c: 14 }, // 24
  { r: 8, c: 14 }, // 25
  { r: 8, c: 13 }, // 26 - Peach Start [SAFE]
  { r: 8, c: 12 }, // 27
  { r: 8, c: 11 }, // 28
  { r: 8, c: 10 }, // 29
  { r: 8, c: 9 },  // 30 - DARE 💌
  { r: 9, c: 8 },  // 31
  { r: 10, c: 8 }, // 32
  { r: 11, c: 8 }, // 33
  { r: 12, c: 8 }, // 34 - [SAFE]
  { r: 13, c: 8 }, // 35
  { r: 14, c: 8 }, // 36 - AFFECTION ✨
  { r: 14, c: 7 }, // 37
  { r: 14, c: 6 }, // 38
  { r: 13, c: 6 }, // 39 - Mint Start [SAFE]
  { r: 12, c: 6 }, // 40
  { r: 11, c: 6 }, // 41
  { r: 10, c: 6 }, // 42
  { r: 9, c: 6 },  // 43 - DARE 💌
  { r: 8, c: 5 },  // 44
  { r: 8, c: 4 },  // 45
  { r: 8, c: 3 },  // 46
  { r: 8, c: 2 },  // 47 - [SAFE]
  { r: 8, c: 1 },  // 48
  { r: 8, c: 0 },  // 49 - AFFECTION ✨
  { r: 7, c: 0 },  // 50
  { r: 6, c: 0 }   // 51
];

// Colored home runways leading to the center
export const RUNWAY_COORDS: Record<PlayerColor, GridCoord[]> = {
  rose: [
    { r: 7, c: 1 },
    { r: 7, c: 2 },
    { r: 7, c: 3 },
    { r: 7, c: 4 },
    { r: 7, c: 5 }
  ],
  lavender: [
    { r: 1, c: 7 },
    { r: 2, c: 7 },
    { r: 3, c: 7 },
    { r: 4, c: 7 },
    { r: 5, c: 7 }
  ],
  peach: [
    { r: 7, c: 13 },
    { r: 7, c: 12 },
    { r: 7, c: 11 },
    { r: 7, c: 10 },
    { r: 7, c: 9 }
  ],
  mint: [
    { r: 13, c: 7 },
    { r: 12, c: 7 },
    { r: 11, c: 7 },
    { r: 10, c: 7 },
    { r: 9, c: 7 }
  ]
};

// Base / Yard token slot coordinates for each corner (4 tokens each, spaced with proper 2-tile gap)
export const BASE_SLOTS_COORDS: Record<PlayerColor, GridCoord[]> = {
  // Top-Left corner (Rose)
  rose: [
    { r: 1, c: 1 },
    { r: 1, c: 4 },
    { r: 4, c: 1 },
    { r: 4, c: 4 }
  ],
  // Top-Right corner (Lavender)
  lavender: [
    { r: 1, c: 10 },
    { r: 1, c: 13 },
    { r: 4, c: 10 },
    { r: 4, c: 13 }
  ],
  // Bottom-Right corner (Peach)
  peach: [
    { r: 10, c: 10 },
    { r: 10, c: 13 },
    { r: 13, c: 10 },
    { r: 13, c: 13 }
  ],
  // Bottom-Left corner (Mint)
  mint: [
    { r: 10, c: 1 },
    { r: 10, c: 4 },
    { r: 13, c: 1 },
    { r: 13, c: 4 }
  ]
};

// Center home chamber slots (rows 6..8, cols 6..8)
export const HOME_SLOTS: Record<PlayerColor, GridCoord> = {
  rose: { r: 7, c: 6 },
  lavender: { r: 6, c: 7 },
  peach: { r: 7, c: 8 },
  mint: { r: 8, c: 7 }
};

export function getCoordForProgress(color: PlayerColor, progress: number, tokenId: number): GridCoord {
  if (progress === -1) {
    return BASE_SLOTS_COORDS[color][tokenId] || { r: 2, c: 2 };
  }
  if (progress === 56) {
    return HOME_SLOTS[color];
  }
  if (progress >= 51 && progress <= 55) {
    return RUNWAY_COORDS[color][progress - 51];
  }
  const startIndex = COLOR_STYLES[color].startIndex;
  const tileIndex = (startIndex + progress) % 52;
  return MAIN_TRACK_COORDS[tileIndex];
}

export const COLOR_STYLES: Record<PlayerColor, {
  name: string;
  emoji: string;
  bgGrad: string;
  glow: string;
  border: string;
  tokenBg: string;
  textColor: string;
  tokenShadow: string;
  startIndex: number;
}> = {
  rose: {
    name: 'Rose Romance',
    emoji: '💖',
    bgGrad: 'from-pink-600/30 to-rose-700/40',
    glow: 'rgba(244, 63, 94, 0.5)',
    border: 'border-rose-400/60',
    tokenBg: 'bg-gradient-to-tr from-rose-600 to-pink-400',
    textColor: 'text-rose-300',
    tokenShadow: 'shadow-[0_0_15px_rgba(244,63,94,0.7)]',
    startIndex: 0
  },
  lavender: {
    name: 'Lavender Dream',
    emoji: '💜',
    bgGrad: 'from-purple-600/30 to-indigo-700/40',
    glow: 'rgba(168, 85, 247, 0.5)',
    border: 'border-purple-400/60',
    tokenBg: 'bg-gradient-to-tr from-purple-600 to-indigo-400',
    textColor: 'text-purple-300',
    tokenShadow: 'shadow-[0_0_15px_rgba(168,85,247,0.7)]',
    startIndex: 13
  },
  peach: {
    name: 'Sunset Peach',
    emoji: '🍑',
    bgGrad: 'from-orange-600/30 to-amber-700/40',
    glow: 'rgba(251, 146, 60, 0.5)',
    border: 'border-orange-400/60',
    tokenBg: 'bg-gradient-to-tr from-orange-500 to-amber-300',
    textColor: 'text-amber-300',
    tokenShadow: 'shadow-[0_0_15px_rgba(251,146,60,0.7)]',
    startIndex: 26
  },
  mint: {
    name: 'Mint Sparkle',
    emoji: '🌿',
    bgGrad: 'from-teal-600/30 to-emerald-700/40',
    glow: 'rgba(45, 212, 191, 0.5)',
    border: 'border-teal-400/60',
    tokenBg: 'bg-gradient-to-tr from-teal-500 to-emerald-300',
    textColor: 'text-teal-300',
    tokenShadow: 'shadow-[0_0_15px_rgba(45,212,191,0.7)]',
    startIndex: 39
  }
};
