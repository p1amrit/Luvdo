import { io, Socket } from 'socket.io-client';
import { Player, GameMode, AestheticTheme, RoomVibe, ReactionType } from '../types/game';

// If running in development with Vite proxy, native mobile app, or production web
const PRODUCTION_LIVE_URL = 'https://luvdo.onrender.com';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (
  typeof window !== 'undefined' && window.location.port === '3000'
    ? 'http://localhost:4000'
    : (typeof window !== 'undefined' && (
        window.location.protocol === 'capacitor:' || 
        window.location.protocol === 'file:' || 
        (window.location.hostname === 'localhost' && window.location.port !== '4000' && window.location.port !== '3000')
      ))
      ? PRODUCTION_LIVE_URL
      : '/'
);

class SocketService {
  public socket: Socket | null = null;

  public connect(): Socket {
    if (!this.socket) {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to LUVDO server:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from LUVDO server');
      });
    }
    return this.socket;
  }

  public getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  public joinRoom(roomId: string, player: Partial<Player>) {
    this.getSocket().emit('join-room', { roomId, player });
  }

  public updateRoomSettings(roomId: string, settings: {
    theme?: AestheticTheme;
    vibe?: RoomVibe;
    mode?: GameMode;
    gentleMode?: boolean;
    quickMode?: boolean;
  }) {
    this.getSocket().emit('update-room-settings', { roomId, settings });
  }

  public toggleReady(roomId: string, playerId: string) {
    this.getSocket().emit('toggle-ready', { roomId, playerId });
  }

  public updateProfile(roomId: string, playerId: string, profile: { name?: string; avatar?: string; color?: string }) {
    this.getSocket().emit('update-player-profile', { roomId, playerId, profile });
  }

  public startGame(roomId: string) {
    this.getSocket().emit('start-game', { roomId });
  }

  public rollDice(roomId: string, playerId: string) {
    this.getSocket().emit('roll-dice', { roomId, playerId });
  }

  public moveToken(roomId: string, playerId: string, tokenId: number) {
    this.getSocket().emit('move-token', { roomId, playerId, tokenId });
  }

  public completeDare(roomId: string) {
    this.getSocket().emit('complete-dare', { roomId });
  }

  public sendChatMessage(roomId: string, message: {
    senderId: string;
    senderName: string;
    senderAvatar: string;
    text: string;
    loveReaction?: string | null;
  }) {
    this.getSocket().emit('send-chat', { roomId, message });
  }

  public sendReaction(roomId: string, reaction: {
    type: ReactionType;
    fromName: string;
    x?: number;
    y?: number;
  }) {
    this.getSocket().emit('floating-reaction', { roomId, reaction });
  }

  public sendScreenTouch(roomId: string, playerId: string, x: number, y: number) {
    this.getSocket().emit('touch-screen', { roomId, playerId, x, y });
  }

  public syncMusic(roomId: string, musicState: {
    isPlaying: boolean;
    trackIndex: number;
    trackTitle: string;
    currentTime: number;
  }) {
    this.getSocket().emit('sync-music', { roomId, musicState });
  }
}

export const socketService = new SocketService();
