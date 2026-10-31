import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Volume2, VolumeX, ArrowLeft, Users } from 'lucide-react';
import { Room, GameState, AestheticTheme, RoomVibe, ChatMessage } from './types/game';
import { socketService } from './services/socket';
import { sounds } from './services/soundEffects';
import { AestheticBackground } from './components/AestheticBackground';
import { LobbyView } from './components/LobbyView';
import { LudoBoard } from './components/LudoBoard';
import { DiceRoller } from './components/DiceRoller';
import { VoiceChatBar } from './components/VoiceChatBar';
import { TextChatDrawer } from './components/TextChatDrawer';
import { FloatingReactionOverlay } from './components/FloatingReactionOverlay';
import { LofiPlayer } from './components/LofiPlayer';
import { VictoryModal } from './components/VictoryModal';

const DEFAULT_AVATARS = ['😎', '🍕', '🎮', '🚀', '🐱', '👑', '🥰', '💖', '🐰', '🐻', '🥑', '✨'];

export const App: React.FC = () => {
  // Navigation & User State
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<RoomVibe>('friends');
  const [guestName, setGuestName] = useState(() => localStorage.getItem('luvdo_name') || 'PixelKing');
  const [guestAvatar, setGuestAvatar] = useState(() => localStorage.getItem('luvdo_avatar') || '😎');
  const [myPlayerId] = useState(() => {
    let id = localStorage.getItem('luvdo_player_id');
    if (!id) {
      id = `p-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('luvdo_player_id', id);
    }
    return id;
  });

  // Room & Game State
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [floatingToast, setFloatingToast] = useState<ChatMessage | null>(null);
  const [currentTheme, setCurrentTheme] = useState<AestheticTheme>('celestial');
  const [isMuted, setIsMuted] = useState(false);
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [synchronizedPulse, setSynchronizedPulse] = useState(false);
  const [partnerTouch, setPartnerTouch] = useState<{ x: number; y: number } | null>(null);

  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = room?.id || roomId;
  }, [room, roomId]);

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

  // Setup Socket Listeners
  useEffect(() => {
    const socket = socketService.connect();

    socket.on('room-updated', ({ room: updatedRoom }: { room: Room }) => {
      setRoom(updatedRoom);
      if (updatedRoom.theme) {
        setCurrentTheme(updatedRoom.theme);
      }
      if (updatedRoom.vibe) {
        setSelectedVibe(updatedRoom.vibe);
      }
      if (updatedRoom.gameState) {
        setGameState(updatedRoom.gameState);
      }
      if (updatedRoom.chatMessages) {
        setChatMessages(updatedRoom.chatMessages);
      }
    });

    socket.on('new-chat-message', ({ message }: { message: ChatMessage }) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      if (!message.isSystem) {
        setFloatingToast(message);
        setTimeout(() => setFloatingToast(null), 3600);
      }
    });

    socket.on('game-started', ({ gameState: newGameState, room: updatedRoom }: { gameState: GameState; room: Room }) => {
      setGameState(newGameState);
      setRoom(updatedRoom);
      sounds.playDareCardSparkle();
    });

    socket.on('dice-rolled', ({ gameState: newGameState, rollResult }: { gameState: GameState; rollResult?: { movableTokenIds: number[] } }) => {
      setGameState({ ...newGameState });

      // Quality-of-life: Auto-move token if it is the ONLY eligible moving token!
      const currentTurnPlayer = newGameState.players[newGameState.currentTurnIndex];
      const movable = rollResult?.movableTokenIds || newGameState.movableTokenIds || [];

      if (
        currentTurnPlayer.id === myPlayerId &&
        movable.length === 1 &&
        !newGameState.winner
      ) {
        const singleTokenId = movable[0];
        setTimeout(() => {
          if (roomIdRef.current) {
            sounds.playTokenStep();
            socketService.moveToken(roomIdRef.current, myPlayerId, singleTokenId);
          }
        }, 550);
      }
    });

    socket.on('token-moved', ({ gameState: newGameState }: { gameState: GameState }) => {
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
      alert(message);
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
      socket.off('error-message');
    };
  }, []);

  // Create Room
  const handleCreateRoom = async () => {
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: guestName,
          hostAvatar: guestAvatar,
          theme: currentTheme,
          vibe: selectedVibe,
          mode: selectedVibe === 'couple' ? 'couple-1v1' : 'free-for-all-4p',
          gentleMode: false,
          quickMode: true
        })
      });

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
      alert('Could not connect to server. Ensure backend is running.');
    }
  };

  // Join Room
  const handleJoinRoom = () => {
    const code = inputRoomCode.trim().toUpperCase();
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
    if (confirm('Leave this room?')) {
      window.location.href = '/';
    }
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

  return (
    <AestheticBackground theme={currentTheme}>
      {/* Top Floating App Bar */}
      <header className="w-full px-4 sm:px-8 py-3.5 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <span className="text-2xl filter drop-shadow heart-pulse">🎲</span>
          <span className="text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
            LUVDO
          </span>
          {inRoom && room && (
            <span className="text-xs font-mono font-bold bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 text-pink-200 ml-1">
              {room.id}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {inRoom && <LofiPlayer roomId={room?.id || ''} musicState={room?.musicState} />}
          {inRoom && <VoiceChatBar roomId={room?.id || ''} />}

          <button
            onClick={toggleSoundMute}
            className="p-2 rounded-full glass-panel hover:bg-white/10 transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} className="text-rose-300" /> : <Volume2 size={16} className="text-pink-200" />}
          </button>

          {inRoom && (
            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-full glass-panel hover:bg-rose-500/30 text-rose-300 transition-colors"
              title="Leave Room"
            >
              <ArrowLeft size={16} />
            </button>
          )}
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
                Aesthetic mood lighting, party dares, synchronized Lo-Fi beats, and seamless voice chat.
              </p>
            </div>

            {/* Choose Vibe Before Creating */}
            <div className="p-4 rounded-3xl glass-panel border border-white/15 text-left space-y-2">
              <span className="text-xs font-semibold text-white/80">Choose Your Vibe:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVibe('friends')}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                    selectedVibe === 'friends'
                      ? 'bg-purple-600/40 border-purple-400 ring-2 ring-purple-400 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">🎉</span>
                  <span className="text-xs font-bold text-white">Friends & Party</span>
                  <span className="text-[10px] text-white/60 text-center hidden sm:inline">Memes, roasts & dares</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVibe('couple')}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                    selectedVibe === 'couple'
                      ? 'bg-pink-600/40 border-pink-400 ring-2 ring-pink-400 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">💖</span>
                  <span className="text-xs font-bold text-white">Couple Date</span>
                  <span className="text-[10px] text-white/60 text-center hidden sm:inline">Sweet prompts & romance</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVibe('casual')}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-1 border transition-all ${
                    selectedVibe === 'casual'
                      ? 'bg-teal-600/40 border-teal-400 ring-2 ring-teal-400 shadow-lg'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">☕</span>
                  <span className="text-xs font-bold text-white">Chill & Casual</span>
                  <span className="text-[10px] text-white/60 text-center hidden sm:inline">Cozy aesthetic match</span>
                </button>
              </div>
            </div>

            {/* Guest Quick Profile Card */}
            <div className="p-5 rounded-3xl glass-panel border border-white/15 text-left space-y-3">
              <span className="text-xs font-semibold text-pink-200">
                Player Profile:
              </span>

              <div className="flex items-center gap-3">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {DEFAULT_AVATARS.map((av) => (
                    <button
                      key={av}
                      onClick={() => setGuestAvatar(av)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                        guestAvatar === av
                          ? 'bg-pink-500/40 border-2 border-pink-400 scale-110'
                          : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your nickname"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleCreateRoom}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-sm shadow-[0_0_30px_rgba(244,63,94,0.5)] transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                <span>Create Room</span>
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
        ) : room?.status === 'lobby' ? (
          /* Room Lobby */
          <LobbyView
            room={room}
            myPlayer={myPlayer}
            onThemeChange={(th) => setCurrentTheme(th)}
          />
        ) : gameState ? (
          /* Live Game View */
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2 sm:gap-4 px-1 sm:px-4">
            {/* Last event banner */}
            {gameState.lastEvent && (
              <div className="px-3 sm:px-4 py-1 rounded-full glass-panel border border-pink-400/30 text-[11px] sm:text-xs font-semibold text-pink-200 text-center shadow-lg animate-fade-in max-w-md truncate">
                {gameState.lastEvent.text}
              </div>
            )}

            {/* Board and Controls */}
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
              {/* Ludo Board */}
              <div className="w-full max-w-[min(96vw,500px)]">
                <LudoBoard
                  gameState={gameState}
                  myPlayerId={myPlayerId}
                  onSelectToken={handleSelectToken}
                  onScreenTouch={handleScreenTouch}
                />
              </div>

              {/* Mobile Compact Dice Bar (md:hidden) */}
              <div className="w-full max-w-[min(96vw,500px)] md:hidden">
                <DiceRoller
                  currentTurnPlayer={currentTurnPlayer}
                  isMyTurn={isMyTurn}
                  diceValue={gameState.diceValue}
                  isRolling={gameState.isRolling}
                  onRoll={handleRollDice}
                  canRoll={canRoll}
                  compact={true}
                />
              </div>

              {/* Desktop Controls Column (hidden md:flex) */}
              <div className="hidden md:flex w-56 flex-col gap-3">
                <DiceRoller
                  currentTurnPlayer={currentTurnPlayer}
                  isMyTurn={isMyTurn}
                  diceValue={gameState.diceValue}
                  isRolling={gameState.isRolling}
                  onRoll={handleRollDice}
                  canRoll={canRoll}
                  compact={false}
                />

                <div className="p-3.5 rounded-2xl glass-panel border border-white/10 text-center space-y-1">
                  <p className="text-[11px] text-white/60 uppercase tracking-wider font-semibold">
                    Target to Win
                  </p>
                  <p className="text-sm font-bold text-pink-300">
                    {gameState.targetTokensToWin} Tokens Home 🏆
                  </p>
                </div>
              </div>
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

      {/* Floating In-Game Chat Notification Toast */}
      {floatingToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full glass-panel border border-pink-400/50 bg-slate-950/95 shadow-2xl flex items-center gap-2 animate-bounce max-w-[90vw] sm:max-w-md pointer-events-none">
          <span className="text-xl shrink-0">{floatingToast.senderAvatar || '💬'}</span>
          <div className="truncate text-xs">
            <span className="font-bold text-pink-300">{floatingToast.sender}: </span>
            <span className="text-white">{floatingToast.text}</span>
          </div>
        </div>
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


      {/* Victory Modal */}
      {inRoom && gameState?.winner && (
        <VictoryModal
          winner={gameState.winner.player}
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
              Enter the room code shared by your friend or partner:
            </p>
            <input
              type="text"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. HONEY-48"
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-mono text-center tracking-widest text-lg font-bold uppercase focus:outline-none focus:ring-2 focus:ring-pink-500"
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
                disabled={!inputRoomCode.trim()}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg"
              >
                Join Match
              </button>
            </div>
          </div>
        </div>
      )}
    </AestheticBackground>
  );
};

export default App;
