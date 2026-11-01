import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createInitialGameState,
  rollDiceForCurrentPlayer,
  moveToken,
  passTurnToNextPlayer,
  COLORS
} from './game/ludoEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(clientDistPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;

// Rooms store: roomId -> room object
const rooms = new Map();

const ROMANTIC_WORDS = ['HONEY', 'ROSE', 'CUPID', 'ANGEL', 'MOON', 'STAR', 'SWEET', 'DOVE', 'LOTUS', 'PEACH'];

function generateRoomCode() {
  const word = ROMANTIC_WORDS[Math.floor(Math.random() * ROMANTIC_WORDS.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${word}-${num}`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Check Room Status
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    roomId: room.id,
    status: room.status,
    playerCount: room.players.length,
    vibe: room.vibe
  });
});

// Create Room Endpoint
app.post('/api/rooms/create', (req, res) => {
  const { hostName, hostAvatar, vibe = 'friends', mode = 'free-for-all-4p', theme = 'celestial', gentleMode = false, quickMode = true } = req.body;
  const roomId = generateRoomCode();

  const newRoom = {
    id: roomId,
    hostId: null, // assigned on socket join
    vibe, // 'friends' | 'couple' | 'casual'
    mode,
    theme,
    gentleMode,
    quickMode,
    status: 'lobby', // 'lobby' | 'playing' | 'ended'
    players: [],
    gameState: null,
    chatMessages: [
      {
        id: 'msg-welcome',
        sender: 'LUVDO Concierge ✨',
        text: 'Welcome to the room! Share the link or room code with friends to join the match.',
        timestamp: Date.now(),
        isSystem: true
      }
    ],
    musicState: {
      isPlaying: false,
      trackIndex: 0,
      trackTitle: 'Midnight Whispers (Lo-Fi)',
      currentTime: 0
    },
    touchSync: {
      touches: {} // playerId -> { x, y, timestamp }
    }
  };

  rooms.set(roomId, newRoom);
  res.json({ roomId, room: newRoom });
});

// Autonomous AI Bot turn logic
function checkAndPlayBotTurn(room) {
  if (!room || !room.gameState || room.gameState.winner || room.status !== 'playing') return;
  const currentTurnPlayer = room.gameState.players[room.gameState.currentTurnIndex];
  if (!currentTurnPlayer || !currentTurnPlayer.isBot) return;

  const turnIndexAtStart = room.gameState.currentTurnIndex;

  setTimeout(() => {
    if (!room.gameState || room.gameState.winner || room.status !== 'playing') return;
    if (room.gameState.currentTurnIndex !== turnIndexAtStart) return;

    if (room.gameState.diceValue === null) {
      const rollResult = rollDiceForCurrentPlayer(room.gameState);
      if (!rollResult) return;

      io.to(room.id).emit('dice-rolled', {
        rollResult,
        gameState: room.gameState
      });

      if (rollResult.penalty || rollResult.movableTokenIds.length === 0) {
        setTimeout(() => {
          if (!room.gameState || room.gameState.winner) return;
          passTurnToNextPlayer(room.gameState);
          io.to(room.id).emit('turn-passed', { gameState: room.gameState });
          checkAndPlayBotTurn(room);
        }, 1400);
      } else {
        setTimeout(() => {
          if (!room.gameState || room.gameState.winner) return;
          if (room.gameState.currentTurnIndex !== turnIndexAtStart) return;

          const movable = rollResult.movableTokenIds;
          let chosenTokenId = movable[0];

          // Priority: 1. Unlock base token if rolled 6, 2. Furthest advanced token
          const baseToken = currentTurnPlayer.tokens.find(t => t.progress === -1 && movable.includes(t.id));
          if (baseToken) {
            chosenTokenId = baseToken.id;
          } else {
            const sorted = movable.slice().sort((a, b) => {
              const progA = currentTurnPlayer.tokens.find(t => t.id === a)?.progress || 0;
              const progB = currentTurnPlayer.tokens.find(t => t.id === b)?.progress || 0;
              return progB - progA;
            });
            chosenTokenId = sorted[0];
          }

          const success = moveToken(room.gameState, chosenTokenId);
          if (success) {
            io.to(room.id).emit('token-moved', { gameState: room.gameState });
            checkAndPlayBotTurn(room);
          }
        }, 1100);
      }
    }
  }, 900);
}

// Socket connection
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Join Room
  socket.on('join-room', ({ roomId, player }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error-message', { message: 'Room not found. Please check your code or create a new room.' });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.playerId = player.id;

    // Check if player already exists in room (reconnection)
    let existingPlayer = room.players.find(p => p.id === player.id);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      existingPlayer.name = player.name || existingPlayer.name;
      existingPlayer.avatar = player.avatar || existingPlayer.avatar;
      existingPlayer.isOnline = true;
    } else {
      // Determine available color
      const usedColors = room.players.map(p => p.color);
      const availableColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[room.players.length % COLORS.length];

      const newPlayer = {
        id: player.id,
        socketId: socket.id,
        name: player.name || `Partner ${room.players.length + 1}`,
        avatar: player.avatar || '🥰',
        color: availableColor,
        isHost: room.players.length === 0,
        isReady: false,
        isOnline: true
      };

      if (room.players.length === 0) {
        room.hostId = player.id;
      }

      room.players.push(newPlayer);

      // System message
      room.chatMessages.push({
        id: `msg-${Date.now()}`,
        sender: 'LUVDO 💖',
        text: `${newPlayer.name} entered the room!`,
        timestamp: Date.now(),
        isSystem: true
      });

      socket.to(roomId).emit('player-joined-notice', { player: newPlayer });
    }

    io.to(roomId).emit('room-updated', { room });
    console.log(`[Room ${roomId}] Player joined: ${player.name} (${socket.id})`);
  });

  // Host updates room settings
  socket.on('update-room-settings', ({ roomId, settings }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (settings.theme) room.theme = settings.theme;
    if (settings.vibe) room.vibe = settings.vibe;
    if (settings.mode) room.mode = settings.mode;
    if (typeof settings.gentleMode === 'boolean') room.gentleMode = settings.gentleMode;
    if (typeof settings.quickMode === 'boolean') room.quickMode = settings.quickMode;

    io.to(roomId).emit('room-updated', { room });
  });

  // Toggle ready status
  socket.on('toggle-ready', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      io.to(roomId).emit('room-updated', { room });
    }
  });

  // Change player color or avatar
  socket.on('update-player-profile', ({ roomId, playerId, profile }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      if (profile.name) player.name = profile.name;
      if (profile.avatar) player.avatar = profile.avatar;
      if (profile.color && COLORS.includes(profile.color)) {
        player.color = profile.color;
      }
      io.to(roomId).emit('room-updated', { room });
    }
  });

  // Start Game
  socket.on('start-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.status = 'playing';
    room.gameState = createInitialGameState(room.players, {
      mode: room.mode,
      vibe: room.vibe || 'friends',
      gentleMode: room.gentleMode,
      quickMode: room.quickMode
    });

    const startMsg = room.vibe === 'couple'
      ? 'Game started! Have a sweet, romantic date match! 💖✨'
      : 'Game started! May the best player win! Let the games begin! 🎲🔥';

    room.chatMessages.push({
      id: `msg-${Date.now()}`,
      sender: 'LUVDO ✨',
      text: startMsg,
      timestamp: Date.now(),
      isSystem: true
    });

    io.to(roomId).emit('game-started', { gameState: room.gameState, room });
    checkAndPlayBotTurn(room);
  });

  // Add AI Bot (Max 4 players)
  socket.on('add-bot', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'lobby') return;
    if (room.players.length >= 4) {
      socket.emit('error-message', { message: 'Room is full (max 4 players)!' });
      return;
    }

    const usedColors = room.players.map(p => p.color);
    const availableColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[room.players.length % COLORS.length];
    const botCount = room.players.filter(p => p.isBot).length + 1;
    const botNames = ['CupidBot 🤖', 'LudoAI ⚡', 'PixelBuddy 👾', 'StarBot ⭐'];
    const botName = botNames[(botCount - 1) % botNames.length];

    const botPlayer = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      socketId: 'bot-internal',
      name: botName,
      avatar: '🤖',
      color: availableColor,
      isHost: false,
      isReady: true,
      isOnline: true,
      isBot: true
    };

    room.players.push(botPlayer);
    io.to(roomId).emit('player-joined-notice', { player: botPlayer });
    io.to(roomId).emit('room-updated', { room });
  });

  // Remove AI Bot
  socket.on('remove-bot', ({ roomId, botId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'lobby') return;
    const botToRemove = room.players.find(p => p.id === botId);
    room.players = room.players.filter(p => p.id !== botId);
    if (botToRemove) {
      io.to(roomId).emit('player-left-notice', { player: botToRemove });
    }
    io.to(roomId).emit('room-updated', { room });
  });

  // Roll Dice
  socket.on('roll-dice', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;

    const currentPlayer = room.gameState.players[room.gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) {
      socket.emit('error-message', { message: "It's not your turn to roll!" });
      return;
    }

    if (room.gameState.diceValue !== null) {
      socket.emit('error-message', { message: 'You have already rolled! Select a token to move.' });
      return;
    }

    const rollResult = rollDiceForCurrentPlayer(room.gameState);
    if (!rollResult) return;

    io.to(roomId).emit('dice-rolled', {
      rollResult,
      gameState: room.gameState
    });

    // If no moves were available or 3-sixes penalty, wait 1400ms so players see the dice roll, then pass turn
    if (rollResult.penalty || rollResult.movableTokenIds.length === 0) {
      setTimeout(() => {
        if (!room.gameState || room.gameState.winner) return;
        passTurnToNextPlayer(room.gameState);
        io.to(roomId).emit('turn-passed', { gameState: room.gameState });
        checkAndPlayBotTurn(room);
      }, 1400);
    }
  });

  // Move Token
  socket.on('move-token', ({ roomId, playerId, tokenId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;

    const currentPlayer = room.gameState.players[room.gameState.currentTurnIndex];
    if (currentPlayer.id !== playerId) {
      return;
    }

    const success = moveToken(room.gameState, tokenId);
    if (success) {
      io.to(roomId).emit('token-moved', { gameState: room.gameState });
      checkAndPlayBotTurn(room);
    }
  });

  // Dismiss / Complete Dare
  socket.on('complete-dare', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || !room.gameState) return;

    room.gameState.activeDare = null;
    io.to(roomId).emit('dare-completed', { gameState: room.gameState });
  });

  // Live Chat Message
  socket.on('send-chat', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: message.senderId,
      sender: message.senderName || 'Partner',
      senderAvatar: message.senderAvatar || '🥰',
      text: message.text,
      timestamp: Date.now(),
      loveReaction: message.loveReaction || null
    };

    room.chatMessages.push(newMsg);
    // Keep max 100 messages
    if (room.chatMessages.length > 100) room.chatMessages.shift();

    io.to(roomId).emit('new-chat-message', { message: newMsg });
  });

  // Screen Micro-Interactions: Floating Emoji Reactions
  socket.on('floating-reaction', ({ roomId, reaction }) => {
    // reaction: { type: 'kiss' | 'rose' | 'hearts' | 'pillow' | 'sparkle', fromName, x, y }
    io.to(roomId).emit('floating-reaction-triggered', {
      ...reaction,
      id: `react-${Date.now()}-${Math.random()}`
    });
  });

  // Synchronized Screen Touch (Heartbeat)
  socket.on('touch-screen', ({ roomId, playerId, x, y }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.touchSync.touches[playerId] = { x, y, timestamp: Date.now() };

    const activeTouches = Object.values(room.touchSync.touches).filter(
      t => Date.now() - t.timestamp < 1200
    );

    // If at least 2 players touch within 1.2s, trigger synchronized couple pulse!
    if (activeTouches.length >= 2) {
      io.to(roomId).emit('synchronized-heartbeat-pulse', {
        touches: activeTouches
      });
      room.touchSync.touches = {};
    } else {
      socket.to(roomId).emit('partner-screen-touched', { x, y, playerId });
    }
  });

  // Synchronized Lo-Fi Radio Player
  socket.on('sync-music', ({ roomId, musicState }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.musicState = { ...room.musicState, ...musicState };
    socket.to(roomId).emit('music-synced', { musicState: room.musicState });
  });

  // WebRTC Voice Signaling
  socket.on('voice-join', ({ roomId, peerId }) => {
    socket.to(roomId).emit('voice-user-joined', { peerId, socketId: socket.id });
  });

  socket.on('voice-signal', ({ toSocketId, signal, fromSocketId }) => {
    io.to(toSocketId).emit('voice-signal', {
      signal,
      fromSocketId: fromSocketId || socket.id
    });
  });

  socket.on('voice-leave', ({ roomId }) => {
    socket.to(roomId).emit('voice-user-left', { socketId: socket.id });
  });

  // Disconnection
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const playerId = socket.data.playerId;

    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.isOnline = false;
        socket.to(roomId).emit('player-left-notice', { player });
        io.to(roomId).emit('room-updated', { room });
      }
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Production fallback: serve index.html for all non-API GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    return res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).send('LUVDO Game Server running.');
      }
    });
  }
  next();
});

httpServer.listen(PORT, () => {
  console.log(`💖 LUVDO Server listening on port ${PORT}`);
});
