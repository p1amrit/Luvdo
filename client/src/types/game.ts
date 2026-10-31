export type PlayerColor = 'rose' | 'lavender' | 'peach' | 'mint';
export type GameMode = 'couple-1v1' | 'power-couple-2v2' | 'free-for-all-4p';
export type AestheticTheme = 'celestial' | 'candlelight' | 'cherry-blossom';
export type RoomVibe = 'friends' | 'couple' | 'casual';

export interface Token {
  id: number;
  progress: number; // -1 = base, 0..50 = main track, 51..55 = home runway, 56 = home
  stepHistory: number[];
}

export interface Player {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  team: number;
  tokens: Token[];
  tokensHome: number;
  hasWon: boolean;
  isHost: boolean;
  isReady: boolean;
  isOnline: boolean;
  isBot?: boolean;
}

export interface DareCard {
  id: string;
  vibe?: string;
  category: string;
  title: string;
  prompt: string;
  icon: string;
}

export interface GameEvent {
  type: string;
  text: string;
  color?: PlayerColor;
  dice?: number;
  bonusTurn?: boolean;
  card?: DareCard;
}

export interface GameState {
  mode: GameMode;
  vibe: RoomVibe;
  gentleMode: boolean;
  quickMode: boolean;
  targetTokensToWin: number;
  players: Player[];
  currentTurnIndex: number;
  diceValue: number | null;
  rollId?: string | null;
  isRolling: boolean;
  consecutiveSixes: number;
  movableTokenIds: number[];
  winner: {
    player: Player;
    mode: GameMode;
  } | null;
  lastEvent: GameEvent;
  activeDare: {
    card: DareCard;
    recipient: Player;
    timestamp: number;
  } | null;
  roundCount: number;
}

export interface ChatMessage {
  id: string;
  senderId?: string;
  sender: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  loveReaction?: string | null;
}

export type ReactionType = 'kiss' | 'rose' | 'hearts' | 'pillow' | 'sparkle' | 'pizza' | 'fire' | 'laugh' | 'clown' | 'trophy' | 'target';

export interface FloatingReaction {
  id: string;
  type: ReactionType;
  fromName: string;
  x?: number;
  y?: number;
}

export interface Room {
  id: string;
  hostId: string | null;
  vibe: RoomVibe;
  mode: GameMode;
  theme: AestheticTheme;
  gentleMode: boolean;
  quickMode: boolean;
  status: 'lobby' | 'playing' | 'ended';
  players: Player[];
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  musicState: {
    isPlaying: boolean;
    trackIndex: number;
    trackTitle: string;
    currentTime: number;
  };
}
