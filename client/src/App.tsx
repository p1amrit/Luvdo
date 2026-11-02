import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Volume2, VolumeX, ArrowLeft, Users } from 'lucide-react';
import { Room, GameState, AestheticTheme, RoomVibe, ChatMessage, Player, PlayerColor } from './types/game';
import { socketService, getApiUrl } from './services/socket';
import { sounds } from './services/soundEffects';
import { AestheticBackground } from './components/AestheticBackground';
import { LobbyView } from './components/LobbyView';
import { LudoBoard } from './components/LudoBoard';
import { PlayerPod } from './components/PlayerPod';
import { VoiceChatBar } from './components/VoiceChatBar';
import { TextChatDrawer } from './components/TextChatDrawer';
import { FloatingReactionOverlay } from './components/FloatingReactionOverlay';
import { VictoryModal } from './components/VictoryModal';
import { voiceChatService } from './services/webrtcVoice';
import { App as CapacitorApp } from '@capacitor/app';

const ALL_MASCOTS = ['😎', '🍕', '🎮', '🚀', '🐱', '👑', '🥰', '💖', '🐰', '🐻', '🦊', '🥑', '🎧', '☕', '✨', '👻'];
const ALL_NICKNAMES = ['PixelKing', 'BobaQueen', 'ChaosGremlin', 'Honeybee', 'Capybara', 'Speedy', 'Noodle', 'Ghostie', 'Cupid', 'Sweetpea', 'Captain', 'VibeMaster', 'StarGazer', 'LuckyDice'];

export const App: React.FC = () => {
  // Navigation & User State
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [guestName, setGuestName] = useState(() => localStorage.getItem('luvdo_name') || 'PixelKing');
  const [guestAvatar, setGuestAvatar] = useState(() => localStorage.getItem('luvdo_avatar') || '😎');
  const [playerNotice, setPlayerNotice] = useState<{ type: 'join' | 'leave'; name: string; avatar: string } | null>(null);
  const [myPlayerId] = useState(() => {
    let id = sessionStorage.getItem('luvdo_player_id');
    if (!id) {
      id = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      sessionStorage.setItem('luvdo_player_id', id);
    }
    return id;
  });

  // Room & Game State
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentTheme, setCurrentTheme] = useState<AestheticTheme>('celestial');
  const [isMuted, setIsMuted] = useState(false);
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [homeChatBubbles, setHomeChatBubbles] = useState<Record<string, { text: string; timestamp: number }>>({});
  const [synchronizedPulse, setSynchronizedPulse] = useState(false);
  const [partnerTouch, setPartnerTouch] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastDiceByColor, setLastDiceByColor] = useState<Record<PlayerColor, number | null>>({
    rose: null,
    lavender: null,
    peach: null,
    mint: null
  });
  const autoMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 15-second Turn Countdown Timer & Auto-play fallback
  const [turnTimePercent, setTurnTimePercent] = useState<number>(100);
  const turnStartTimeRef = useRef<number>(Date.now());
  const autoPlayedRef = useRef<boolean>(false);

  const roomIdRef = useRef(roomId);
  const roomRef = useRef<Room | null>(room);
  const gameStateRef = useRef<GameState | null>(gameState);

  useEffect(() => {
    roomIdRef.current = room?.id || roomId;
    roomRef.current = room;
  }, [room, roomId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Turn Timer running around active player's badge
  useEffect(() => {
    if (!gameState || gameState.winner) {
      setTurnTimePercent(100);
      return;
    }

    turnStartTimeRef.current = Date.now();
    autoPlayedRef.current = false;
    setTurnTimePercent(100);

    const interval = setInterval(() => {
      const elapsed = Date.now() - turnStartTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / 15000) * 100);
      setTurnTimePercent(remaining);

      if (remaining <= 0 && !autoPlayedRef.current) {
        autoPlayedRef.current = true;
        const currentGameState = gameStateRef.current;
        if (!currentGameState || currentGameState.winner) return;

        const currentTurnPlayer = currentGameState.players[currentGameState.currentTurnIndex];
        if (currentTurnPlayer?.id === myPlayerId) {
          if (currentGameState.diceValue === null) {
            if (roomIdRef.current) {
              socketService.rollDice(roomIdRef.current, myPlayerId);
            }
          } else if (currentGameState.movableTokenIds && currentGameState.movableTokenIds.length > 0) {
            if (roomIdRef.current) {
              socketService.moveToken(roomIdRef.current, myPlayerId, currentGameState.movableTokenIds[0]);
            }
          }
        }
      }
    }, 60);

    return () => clearInterval(interval);
  }, [gameState?.currentTurnIndex, gameState?.rollId, gameState?.winner, myPlayerId]);

  // Check URL query parameters for ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInputRoomCode(roomParam.toUpperCase());
      setJoinModalOpen(true);
    }
  }, []);

  // Save guest preferences to localStorage
  useEffect(() => {
    localStorage.setItem('luvdo_name', guestName);
    localStorage.setItem('luvdo_avatar', guestAvatar);
  }, [guestName, guestAvatar]);

  const handleRandomNickname = () => {
    const rand = ALL_NICKNAMES[Math.floor(Math.random() * ALL_NICKNAMES.length)];
    setGuestName(rand);
  };

  // Browser History & Android Hardware Back Button Handling (Prevents site/app from closing accidentally)
  useEffect(() => {
    if (inRoom) {
      window.history.pushState({ inRoom: true }, '', window.location.href);
    }
  }, [inRoom, room?.id]);

  useEffect(() => {
    const handleBackButton = () => {
      if (joinModalOpen) {
        setJoinModalOpen(false);
        return;
      }
      if (inRoom) {
        setShowLeaveModal(true);
        // Push state back so browser history entry remains while dialog is open
        window.history.pushState({ inRoom: true }, '', window.location.href);
        return;
      }
    };

    const handlePopState = () => {
      handleBackButton();
    };

    window.addEventListener('popstate', handlePopState);

    let capacitorListener: any = null;
    try {
      CapacitorApp.addListener('backButton', () => {
        handleBackButton();
      }).then((l) => {
        capacitorListener = l;
      });
    } catch (_) {}

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (capacitorListener && typeof capacitorListener.remove === 'function') {
        capacitorListener.remove();
      }
    };
  }, [inRoom, joinModalOpen]);

  // Setup Socket Listeners
  useEffect(() => {
    const socket = socketService.connect();

    socket.on('room-updated', ({ room: updatedRoom }: { room: Room }) => {
      setRoom(updatedRoom);
      setInRoom(true);
      if (updatedRoom.theme) {
        setCurrentTheme(updatedRoom.theme);
      }
      if (updatedRoom.gameState) {
        setGameState(updatedRoom.gameState);
      }
      if (updatedRoom.chatMessages) {
        setChatMessages(updatedRoom.chatMessages);
      }
    });

    socket.on('player-joined-notice', ({ player }: { player: Player }) => {
      sounds.playPlayerJoin();
      setPlayerNotice({ type: 'join', name: player.name, avatar: player.avatar });
      setTimeout(() => setPlayerNotice(null), 3600);
    });

    socket.on('player-left-notice', ({ player }: { player: Player }) => {
      sounds.playPlayerLeave();
      setPlayerNotice({ type: 'leave', name: player.name, avatar: player.avatar });
      setTimeout(() => setPlayerNotice(null), 3600);
    });

    socket.on('new-chat-message', ({ message }: { message: ChatMessage }) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (!message.isSystem) {
        // Ludo King Speech Bubble: Map sender to their player color
        const allPlayers = gameStateRef.current?.players || roomRef.current?.players || [];
        const sender = allPlayers.find((p) => p.id === message.senderId || p.name === message.sender);
        if (sender) {
          const colorKey = sender.color;
          const msgTimestamp = Date.now();
          setHomeChatBubbles((prev) => ({
            ...prev,
            [colorKey]: { text: message.text, timestamp: msgTimestamp }
          }));
          sounds.playChatPop();

          // Auto-remove speech bubble after 3.5 seconds so it cleanly disappears
          setTimeout(() => {
            setHomeChatBubbles((prev) => {
              if (prev[colorKey]?.timestamp === msgTimestamp) {
                const next = { ...prev };
                delete next[colorKey];
                return next;
              }
              return prev;
            });
          }, 3500);
        }
      }
    });

    socket.on('game-started', ({ gameState: newGameState, room: updatedRoom }: { gameState: GameState; room: Room }) => {
      setGameState(newGameState);
      setRoom(updatedRoom);
      setInRoom(true);
      sounds.playDareCardSparkle();
    });

    socket.on('dice-rolled', ({ gameState: newGameState, rollResult }: { gameState: GameState; rollResult?: { movableTokenIds: number[] } }) => {
      setGameState({ ...newGameState });

      const currentTurnPlayer = newGameState.players[newGameState.currentTurnIndex];
      if (currentTurnPlayer && newGameState.diceValue !== null) {
        setLastDiceByColor((prev) => ({
          ...prev,
          [currentTurnPlayer.color]: newGameState.diceValue
        }));
      }

      if (autoMoveTimerRef.current) {
        clearTimeout(autoMoveTimerRef.current);
        autoMoveTimerRef.current = null;
      }

      // Auto-move token briskly if it is the ONLY eligible moving token right as the dice settles!
      const movable = rollResult?.movableTokenIds || newGameState.movableTokenIds || [];

      if (
        currentTurnPlayer.id === myPlayerId &&
        movable.length === 1 &&
        !newGameState.winner
      ) {
        const singleTokenId = movable[0];
        autoMoveTimerRef.current = setTimeout(() => {
          autoMoveTimerRef.current = null;
          if (roomIdRef.current) {
            sounds.playTokenStep();
            socketService.moveToken(roomIdRef.current, myPlayerId, singleTokenId);
          }
        }, 460);
      }
    });

    socket.on('token-moved', ({ gameState: newGameState }: { gameState: GameState }) => {
      setGameState({ ...newGameState });
    });

    socket.on('game-ended', ({ gameState: newGameState }: { gameState: GameState }) => {
      setGameState({ ...newGameState });
    });

    socket.on('turn-passed', ({ gameState: newGameState }: { gameState: GameState }) => {
      setGameState({ ...newGameState });
    });

    socket.on('synchronized-heartbeat-pulse', () => {
      setSynchronizedPulse(true);
      sounds.playKissSound();
      setTimeout(() => setSynchronizedPulse(false), 2000);
    });

    socket.on('partner-screen-touched', ({ x, y }: { x: number; y: number }) => {
      setPartnerTouch({ x, y });
      setTimeout(() => setPartnerTouch(null), 1200);
    });

    socket.on('error-message', ({ message }: { message: string }) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3200);
      if (message.toLowerCase().includes('not found')) {
        setInRoom(false);
        setRoom(null);
      }
    });

    return () => {
      socket.off('room-updated');
      socket.off('new-chat-message');
      socket.off('game-started');
      socket.off('dice-rolled');
      socket.off('token-moved');
      socket.off('turn-passed');
      socket.off('synchronized-heartbeat-pulse');
      socket.off('partner-screen-touched');
      socket.off('player-joined-notice');
      socket.off('player-left-notice');
      socket.off('error-message');
    };
  }, []);

  // Create Room
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const handleCreateRoom = async () => {
    if (isCreatingRoom) return;
    setIsCreatingRoom(true);
    try {
      const url = getApiUrl('/api/rooms/create');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: guestName,
          hostAvatar: guestAvatar,
          theme: currentTheme,
          vibe: 'friends',
          mode: 'free-for-all-4p',
          gentleMode: false,
          quickMode: true
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        setInRoom(true);
        socketService.joinRoom(data.roomId, {
          id: myPlayerId,
          name: guestName,
          avatar: guestAvatar
        });
      }
    } catch (e) {
      console.error('Failed to create room:', e);
      alert('Connecting to live game server... If this is the first match of the hour, the server may take ~15-20 seconds to wake up from idle. Please tap again!');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join Room
  const handleJoinRoom = () => {
    const code = inputRoomCode.trim();
    if (!code) return;

    setRoomId(code);
    setInRoom(true);
    setJoinModalOpen(false);

    socketService.joinRoom(code, {
      id: myPlayerId,
      name: guestName,
      avatar: guestAvatar
    });
  };

  const handleRollDice = () => {
    if (!room || !gameState) return;
    socketService.rollDice(room.id, myPlayerId);
  };

  const handleSelectToken = (tokenId: number) => {
    if (autoMoveTimerRef.current) {
      clearTimeout(autoMoveTimerRef.current);
      autoMoveTimerRef.current = null;
    }
    if (!room || !gameState) return;
    socketService.moveToken(room.id, myPlayerId, tokenId);
  };

  const handleScreenTouch = (x: number, y: number) => {
    if (!room) return;
    socketService.sendScreenTouch(room.id, myPlayerId, x, y);
  };

  const toggleSoundMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleLeaveRoom = () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveRoom = () => {
    setShowLeaveModal(false);
    if (voiceChatService.getIsActive()) {
      voiceChatService.stopVoice();
    }
    if ((room?.id || roomId) && myPlayerId) {
      socketService.leaveRoom(room?.id || roomId, myPlayerId);
    }
    setInRoom(false);
    setRoom(null);
    setGameState(null);
    window.history.pushState(null, '', '/');
  };

  const myPlayer = room?.players.find((p) => p.id === myPlayerId) || {
    id: myPlayerId,
    socketId: '',
    name: guestName,
    avatar: guestAvatar,
    color: 'rose',
    team: 0,
    tokens: [],
    tokensHome: 0,
    hasWon: false,
    isHost: false,
    isReady: true,
    isOnline: true
  };

  const currentTurnPlayer = gameState?.players[gameState.currentTurnIndex] || myPlayer;
  const isMyTurn = currentTurnPlayer.id === myPlayerId;
  const canRoll = isMyTurn && gameState?.diceValue === null && !gameState?.winner;

  const rosePlayer = gameState?.players.find((p) => p.color === 'rose');
  const lavenderPlayer = gameState?.players.find((p) => p.color === 'lavender');
  const peachPlayer = gameState?.players.find((p) => p.color === 'peach');
  const mintPlayer = gameState?.players.find((p) => p.color === 'mint');

  return (
    <AestheticBackground theme={currentTheme}>
      {/* Top Floating App Bar */}
      <header className="w-full px-2.5 sm:px-6 py-2 sm:py-3.5 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {inRoom && (
            <button
              onClick={handleLeaveRoom}
              className="p-1.5 sm:p-2 -ml-0.5 sm:-ml-1 rounded-full glass-panel hover:bg-white/10 active:scale-95 text-pink-200 transition-colors shrink-0 cursor-pointer"
              title="Back / Exit Match"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <span className="text-xl sm:text-2xl filter drop-shadow heart-pulse shrink-0">🎲</span>
            <span className="text-base sm:text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400 shrink-0">
              LUVDO
            </span>
            {inRoom && room && (
              <span className="text-[10px] sm:text-xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/15 text-pink-200 whitespace-nowrap truncate max-w-[95px] sm:max-w-none shrink-0">
                {room.id}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {inRoom && <VoiceChatBar roomId={room?.id || ''} className="shrink-0" />}

          <button
            onClick={toggleSoundMute}
            className="p-1.5 sm:p-2 rounded-full glass-panel hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={15} className="text-rose-300" /> : <Volume2 size={15} className="text-pink-200" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 pb-24">
        {!inRoom ? (
          /* Landing Screen */
          <div className="w-full max-w-xl mx-auto text-center space-y-6 sm:space-y-8 px-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill border border-pink-400/30 text-pink-200 text-xs font-medium">
                <Sparkles size={13} className="text-pink-300" />
                <span>Play with Friends, Besties, or Your Date</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-yellow-100 to-purple-300 tracking-tight leading-tight">
                Ludo, Reimagined.
              </h1>

              <p className="text-sm sm:text-base text-pink-100/80 max-w-md mx-auto leading-relaxed">
                Aesthetic mood lighting, party dares, ultra-low latency live voice chat, and real-time multiplayer.
              </p>
            </div>

            {/* Setup Your Profile (Name & Avatar - Set Once Before Entering) */}
            <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-white/20 text-left space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    Set Up Your Player Profile
                  </h3>
                </div>
                <span className="text-[11px] text-pink-300 font-semibold">
                  (Locked upon entering room)
                </span>
              </div>

              {/* Avatar + Nickname Big Preview & Input */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/30 to-purple-500/30 border-2 border-pink-400 flex items-center justify-center text-3xl sm:text-4xl shadow-lg ring-4 ring-pink-400/20">
                    {guestAvatar}
                  </div>
                  <span className="text-[10px] text-pink-200/80 font-bold">Your Mascot</span>
                </div>

                <div className="flex-1 w-full space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/80">Your Player Nickname:</span>
                    <button
                      type="button"
                      onClick={handleRandomNickname}
                      className="text-xs text-pink-300 hover:text-pink-200 underline font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Sparkles size={12} />
                      <span>Random Name</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={20}
                    placeholder="Enter your nickname..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/70 border border-white/25 text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-white/30 shadow-inner"
                  />
                </div>
              </div>

              {/* Mascot Palette Selection */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-white/80">Pick Your Mascot Avatar:</span>
                <div className="grid grid-cols-8 gap-2">
                  {ALL_MASCOTS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setGuestAvatar(av)}
                      className={`h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                        guestAvatar === av
                          ? 'bg-gradient-to-br from-pink-500 to-purple-600 border-2 border-white scale-110 shadow-lg ring-2 ring-pink-400'
                          : 'bg-white/10 hover:bg-white/20 border border-white/10'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleCreateRoom}
                disabled={isCreatingRoom}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 disabled:opacity-60 text-white font-bold text-sm shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} className={isCreatingRoom ? "animate-spin" : ""} />
                <span>{isCreatingRoom ? 'Connecting to Server...' : 'Create Room'}</span>
              </button>

              <button
                onClick={() => setJoinModalOpen(true)}
                className="flex-1 py-4 px-6 rounded-2xl glass-panel hover:bg-white/15 border border-white/20 text-white font-bold text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Users size={18} />
                <span>Join with Code</span>
              </button>
            </div>
          </div>
        ) : inRoom && !room ? (
          /* Connecting Room Fallback */
          <div className="w-full max-w-sm mx-auto p-8 rounded-3xl glass-panel border border-white/20 text-center space-y-4 animate-fade-in">
            <span className="text-4xl animate-bounce inline-block">🎲</span>
            <h3 className="text-base font-bold text-white">Connecting to Room...</h3>
            <p className="text-xs text-pink-200/70">Syncing room details with game server</p>
            <button
              onClick={() => { setInRoom(false); setRoom(null); }}
              className="py-2 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
            >
              Back to Home
            </button>
          </div>
        ) : room?.status === 'lobby' ? (
          /* Room Lobby */
          <LobbyView
            room={room}
            myPlayer={myPlayer}
            onThemeChange={(th) => setCurrentTheme(th)}
          />
        ) : gameState ? (
          /* Live Game Arena: Authentic Ludo King Console Structure */
          <div className="w-full max-w-[min(96vw,440px)] mx-auto flex flex-col items-center gap-1.5 sm:gap-2.5 px-0.5 select-none">
            {/* Last event banner */}
            {gameState.lastEvent && (
              <div
                className={`px-3 sm:px-4 py-1 rounded-full glass-panel border text-[11px] sm:text-xs font-semibold text-center shadow-lg animate-fade-in max-w-md truncate ${
                  gameState.lastEvent.type === 'penalty'
                    ? 'border-amber-400 bg-amber-950/90 text-amber-200 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'border-pink-400/30 text-pink-200'
                }`}
              >
                {gameState.lastEvent.text}
              </div>
            )}

            {/* Top Row: Rose (Left) & Lavender (Right) Consoles */}
            <div className="w-full flex items-center justify-between px-1">
              <PlayerPod
                player={rosePlayer}
                color="rose"
                isCurrentTurn={currentTurnPlayer?.color === 'rose'}
                isMyTurn={isMyTurn && currentTurnPlayer?.color === 'rose'}
                isLocalPlayer={rosePlayer?.id === myPlayerId}
                turnTimePercent={turnTimePercent}
                diceValue={currentTurnPlayer?.color === 'rose' ? gameState.diceValue : null}
                lastDiceValue={lastDiceByColor.rose}
                rollId={gameState.rollId}
                isRolling={gameState.isRolling}
                canRoll={canRoll && currentTurnPlayer?.color === 'rose'}
                onRoll={handleRollDice}
                align="left"
                chatBubble={homeChatBubbles?.rose}
                targetTokensToWin={gameState.targetTokensToWin}
              />

              <PlayerPod
                player={lavenderPlayer}
                color="lavender"
                isCurrentTurn={currentTurnPlayer?.color === 'lavender'}
                isMyTurn={isMyTurn && currentTurnPlayer?.color === 'lavender'}
                isLocalPlayer={lavenderPlayer?.id === myPlayerId}
                turnTimePercent={turnTimePercent}
                diceValue={currentTurnPlayer?.color === 'lavender' ? gameState.diceValue : null}
                lastDiceValue={lastDiceByColor.lavender}
                rollId={gameState.rollId}
                isRolling={gameState.isRolling}
                canRoll={canRoll && currentTurnPlayer?.color === 'lavender'}
                onRoll={handleRollDice}
                align="right"
                chatBubble={homeChatBubbles?.lavender}
                targetTokensToWin={gameState.targetTokensToWin}
              />
            </div>

            {/* 15x15 Clean Ludo Board */}
            <div className="w-full aspect-square">
              <LudoBoard
                gameState={gameState}
                myPlayerId={myPlayerId}
                onSelectToken={handleSelectToken}
                onScreenTouch={handleScreenTouch}
              />
            </div>

            {/* Bottom Row: Mint (Left) & Peach (Right) Consoles */}
            <div className="w-full flex items-center justify-between px-1">
              <PlayerPod
                player={mintPlayer}
                color="mint"
                isCurrentTurn={currentTurnPlayer?.color === 'mint'}
                isMyTurn={isMyTurn && currentTurnPlayer?.color === 'mint'}
                isLocalPlayer={mintPlayer?.id === myPlayerId}
                turnTimePercent={turnTimePercent}
                diceValue={currentTurnPlayer?.color === 'mint' ? gameState.diceValue : null}
                lastDiceValue={lastDiceByColor.mint}
                rollId={gameState.rollId}
                isRolling={gameState.isRolling}
                canRoll={canRoll && currentTurnPlayer?.color === 'mint'}
                onRoll={handleRollDice}
                align="left"
                chatBubble={homeChatBubbles?.mint}
                targetTokensToWin={gameState.targetTokensToWin}
              />

              <PlayerPod
                player={peachPlayer}
                color="peach"
                isCurrentTurn={currentTurnPlayer?.color === 'peach'}
                isMyTurn={isMyTurn && currentTurnPlayer?.color === 'peach'}
                isLocalPlayer={peachPlayer?.id === myPlayerId}
                turnTimePercent={turnTimePercent}
                diceValue={currentTurnPlayer?.color === 'peach' ? gameState.diceValue : null}
                lastDiceValue={lastDiceByColor.peach}
                rollId={gameState.rollId}
                isRolling={gameState.isRolling}
                canRoll={canRoll && currentTurnPlayer?.color === 'peach'}
                onRoll={handleRollDice}
                align="right"
                chatBubble={homeChatBubbles?.peach}
                targetTokensToWin={gameState.targetTokensToWin}
              />
            </div>
          </div>
        ) : null}
      </main>

      {/* Floating Reaction Bar & Overlay */}
      {inRoom && (
        <FloatingReactionOverlay
          roomId={room?.id || roomId}
          playerName={myPlayer.name}
          vibe={room?.vibe}
        />
      )}

      {/* Chat Drawer */}
      {inRoom && (
        <TextChatDrawer
          roomId={room?.id || roomId}
          messages={chatMessages}
          currentUserId={myPlayerId}
          currentUserName={myPlayer.name}
          currentUserAvatar={myPlayer.avatar}
        />
      )}


      {/* Real-Time Player Entry / Exit Popup Notification */}
      {playerNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl glass-panel bg-slate-950/95 border-2 border-pink-400/50 shadow-[0_12px_45px_rgba(0,0,0,0.85)] animate-fade-in pointer-events-none backdrop-blur-xl">
          <span className="text-3xl">{playerNotice.avatar}</span>
          <div>
            <p className="text-xs sm:text-sm font-black text-white">
              {playerNotice.name} {playerNotice.type === 'join' ? 'entered the room!' : 'left the room'}
            </p>
            <p className="text-[10px] sm:text-xs text-pink-300 font-semibold">
              {playerNotice.type === 'join' ? '🎉 Welcome to the match!' : '👋 See you next time!'}
            </p>
          </div>
        </div>
      )}

      {/* Non-Blocking Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-2xl glass-panel bg-slate-950/95 border border-amber-400/60 shadow-2xl animate-fade-in pointer-events-none text-white text-xs font-bold backdrop-blur-xl">
          <span>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Victory Modal */}
      {inRoom && gameState?.winner && (
        <VictoryModal
          winner={gameState.winner.player}
          byForfeit={gameState.winner.byForfeit}
          myPlayerId={myPlayerId}
          roomId={room?.id || roomId}
          vibe={room?.vibe}
          onPlayAgain={() => {
            if (myPlayer.isHost) {
              socketService.startGame(room?.id || roomId);
            }
          }}
        />
      )}

      {/* Synchronized Screen Touch Ripple Pulse */}
      {synchronizedPulse && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="absolute w-72 h-72 rounded-full bg-pink-500/30 blur-2xl animate-ping" />
          <div className="text-7xl filter drop-shadow-[0_0_30px_rgba(244,63,94,1)] animate-bounce select-none">
            ✨
          </div>
        </div>
      )}

      {/* Partner Screen Touch Indicator */}
      {partnerTouch && (
        <div
          className="fixed pointer-events-none z-40 text-2xl -translate-x-1/2 -translate-y-1/2 animate-ping"
          style={{ left: `${partnerTouch.x}%`, top: `${partnerTouch.y}%` }}
        >
          ✨
        </div>
      )}

      {/* Join Room Modal */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl glass-panel bg-slate-950/90 border border-white/20 shadow-2xl space-y-4 text-center">
            <h3 className="text-lg font-bold text-white">Join Room</h3>
            <p className="text-xs text-white/70">
              Enter the 4-digit room code:
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 4829"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-center tracking-widest text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setJoinModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={inputRoomCode.trim().length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg"
              >
                Join Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Room Confirmation Modal (Back Button Protection) */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl glass-panel bg-slate-950/95 border border-pink-500/40 p-6 text-center space-y-4 shadow-2xl">
            <span className="text-4xl block animate-bounce">🚪</span>
            <h3 className="text-lg font-black text-white">Leave Match?</h3>
            <p className="text-xs text-pink-200/80 leading-relaxed">
              Are you sure you want to exit the current room? You can rejoin anytime using code <span className="font-mono font-bold text-pink-300">{room?.id}</span>.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  window.history.pushState({ inRoom: true }, '', window.location.href);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
              >
                Stay & Play
              </button>
              <button
                onClick={confirmLeaveRoom}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer"
              >
                Leave Match
              </button>
            </div>
          </div>
        </div>
      )}
    </AestheticBackground>
  );
};

export default App;
