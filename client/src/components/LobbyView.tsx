import React, { useState } from 'react';
import { Copy, Check, Users, Shield, Mic, ArrowLeftRight, GripVertical } from 'lucide-react';
import { Room, Player, AestheticTheme, GameMode, PlayerColor } from '../types/game';
import { socketService } from '../services/socket';
import { COLOR_STYLES } from '../utils/boardCoordinates';
import { VoiceChatBar } from './VoiceChatBar';
import { AvatarImg } from './AvatarImg';

interface LobbyViewProps {
  room: Room;
  myPlayer: Player;
  onThemeChange: (theme: AestheticTheme) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ room, myPlayer, onThemeChange }) => {
  const [copied, setCopied] = useState(false);
  const [dragOverTeam, setDragOverTeam] = useState<number | null>(null);
  const isHost = myPlayer.isHost;

  const handleCopyLink = () => {
    const origin = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' && window.location.port === '' || window.location.protocol === 'capacitor:'))
      ? 'https://luvdo.onrender.com'
      : window.location.origin;
    const url = `${origin}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const origin = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' && window.location.port === '' || window.location.protocol === 'capacitor:'))
      ? 'https://luvdo.onrender.com'
      : window.location.origin;
    const url = `${origin}?room=${room.id}`;
    const shareText = `🎲 Join my match on LUVDO!\n\nRoom Code: *${room.id}*\n👉 Tap link to join directly: ${url}\n\nLet's see who wins! 💖🔥`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleColorChange = (color: PlayerColor) => {
    socketService.updateProfile(room.id, myPlayer.id, { color });
  };

  const handleStartGame = () => {
    socketService.startGame(room.id);
  };

  const handleModeChange = (mode: GameMode) => {
    socketService.updateRoomSettings(room.id, { mode });
  };

  const handleGentleToggle = () => {
    socketService.updateRoomSettings(room.id, { gentleMode: !room.gentleMode });
  };

  const handleQuickToggle = () => {
    socketService.updateRoomSettings(room.id, { quickMode: !room.quickMode });
  };

  const handleThemeSelect = (theme: AestheticTheme) => {
    onThemeChange(theme);
    socketService.updateRoomSettings(room.id, { theme });
  };

  const handleSwitchTeam = (playerId: string, currentTeam: number) => {
    const targetTeam = currentTeam === 0 ? 1 : 0;
    socketService.updatePlayerTeam(room.id, playerId, targetTeam);
  };

  const handleDropOnTeam = (e: React.DragEvent, targetTeam: number) => {
    e.preventDefault();
    setDragOverTeam(null);
    const playerId = e.dataTransfer.getData('playerId');
    if (playerId) {
      socketService.updatePlayerTeam(room.id, playerId, targetTeam);
    }
  };

  const handleDropOnPlayer = (e: React.DragEvent, targetPlayerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTeam(null);
    const draggedPlayerId = e.dataTransfer.getData('playerId');
    if (draggedPlayerId && draggedPlayerId !== targetPlayerId) {
      socketService.swapPlayerTeams(room.id, draggedPlayerId, targetPlayerId);
    }
  };

  const is2v2Mode = room.mode === 'power-couple-2v2';
  const team1Players = room.players.filter(p => (p.team ?? 0) === 0);
  const team2Players = room.players.filter(p => (p.team ?? 0) === 1);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Title & Room Code Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
          LUVDO
        </h1>
        <p className="text-xs sm:text-sm text-pink-200/80 font-medium">
          Real-time voice arena • 2v2 couple squads • 60FPS arcade Ludo
        </p>

        {/* Shareable Room Box with Copy Link & WhatsApp Share */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-3.5 sm:px-4 py-2 mt-2 rounded-2xl glass-panel border border-pink-400/30 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-pink-200/70">Room:</span>
            <span className="text-sm sm:text-base font-black tracking-widest text-pink-300 font-mono">
              {room.id}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/30 hover:bg-pink-500/40 text-pink-200 text-xs font-semibold transition-all active:scale-95 border border-pink-400/40"
              title="Copy shareable link"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            {/* Direct WhatsApp Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-bold transition-all active:scale-95 border border-emerald-400/50 shadow-md"
              title="Send room invite directly on WhatsApp"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" className="shrink-0 text-emerald-300">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.36 7.33 8.1 7.4 7.87 7.64C7.65 7.88 7.03 8.47 7.03 9.68C7.03 10.89 7.91 12.06 8.03 12.22C8.16 12.39 9.73 14.81 12.18 15.86C14.22 16.74 14.63 16.56 15.08 16.52C15.53 16.48 16.53 15.93 16.74 15.35C16.94 14.77 16.94 14.27 16.88 14.17C16.82 14.07 16.66 14.01 16.42 13.89C16.18 13.77 15 13.19 14.77 13.11C14.54 13.03 14.38 12.99 14.22 13.23C14.05 13.47 13.58 14.01 13.44 14.17C13.3 14.33 13.16 14.35 12.92 14.23C12.68 14.11 11.91 13.86 10.99 13.04C10.28 12.4 9.8 11.61 9.66 11.37C9.52 11.13 9.65 11 9.77 10.88C9.88 10.77 10.02 10.59 10.14 10.45C10.26 10.31 10.3 10.21 10.38 10.05C10.46 9.89 10.42 9.75 10.36 9.63C10.3 9.51 9.83 8.35 9.63 7.88C9.44 7.42 9.24 7.48 9.09 7.47C8.95 7.47 8.79 7.33 8.53 7.33Z"/>
              </svg>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-First Live Voice Room Card */}
      <div className="p-4 rounded-2xl glass-panel border border-emerald-400/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-purple-950/40">
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
            <Mic size={20} className="text-emerald-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">Room Voice Chat</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Low Latency
              </span>
            </div>
            <p className="text-xs text-pink-200/70">
              Talk and laugh with room players with real-time audio
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto flex justify-end">
          <VoiceChatBar roomId={room.id} />
        </div>
      </div>

      {/* Players Section: 2v2 Interactive Team Manager or Standard 4P Grid */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-white/20 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-pink-400" />
            <h3 className="text-base sm:text-lg font-black text-white">
              {is2v2Mode ? '2v2 Squads Setup' : `Players in Room (${room.players.length}/4)`}
            </h3>
          </div>

          {isHost && room.players.length < 4 && (
            <button
              onClick={() => socketService.addBot(room.id)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-500/30 to-indigo-500/30 hover:from-purple-500/50 hover:to-indigo-500/50 border border-purple-400/50 text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <span>🤖 + Add AI Bot</span>
            </button>
          )}
        </div>

        {/* 2v2 Mode: Two Interactive Drag & Drop Team Zones */}
        {is2v2Mode ? (
          <div className="space-y-3">
            {isHost && (
              <p className="text-[11px] text-pink-200/80 font-bold bg-pink-500/10 px-3 py-1.5 rounded-xl border border-pink-400/30 flex items-center gap-1.5">
                <span>👑 Host Permission:</span>
                <span>Drag player cards or tap <ArrowLeftRight size={12} className="inline mx-0.5 text-pink-300" /> to switch & balance teams</span>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Team 1 Container */}
              <div
                onDragOver={(e) => {
                  if (isHost) {
                    e.preventDefault();
                    setDragOverTeam(0);
                  }
                }}
                onDragLeave={() => setDragOverTeam(null)}
                onDrop={(e) => isHost && handleDropOnTeam(e, 0)}
                className={`p-4 rounded-2xl border-2 transition-all min-h-[160px] flex flex-col justify-between ${
                  dragOverTeam === 0
                    ? 'border-pink-400 bg-pink-950/60 ring-2 ring-pink-400/50 scale-[1.01]'
                    : 'border-rose-500/30 bg-rose-950/20'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">💖</span>
                    <span className="text-xs sm:text-sm font-black text-rose-300 uppercase tracking-wide">
                      Team 1 ({team1Players.length}/2)
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-300/70 font-semibold">Rose & Peach</span>
                </div>

                <div className="space-y-2 flex-1">
                  {team1Players.map((player) => {
                    const colStyle = COLOR_STYLES[player.color];
                    const isMe = player.id === myPlayer.id;

                    return (
                      <div
                        key={player.id}
                        draggable={isHost}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('playerId', player.id);
                        }}
                        onDrop={(e) => isHost && handleDropOnPlayer(e, player.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between shadow-md ${
                          isMe
                            ? 'bg-white/20 border-white/60 ring-1 ring-pink-400'
                            : `bg-slate-950/80 ${colStyle.border}`
                        } ${isHost ? 'cursor-grab active:cursor-grabbing hover:border-pink-400' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isHost && (
                            <GripVertical size={14} className="text-white/40 shrink-0" />
                          )}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/20 shrink-0 flex items-center justify-center">
                            <AvatarImg avatar={player.avatar} alt={player.name} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-black text-white truncate max-w-[100px]">
                                {player.name}
                              </p>
                              {isMe && <span className="text-[9px] bg-pink-500/40 text-pink-200 px-1 rounded font-bold">You</span>}
                              {player.isHost && <span className="text-[9px] text-amber-300">👑</span>}
                            </div>
                            <span className={`text-[10px] font-bold ${colStyle.textColor}`}>
                              {colStyle.emoji} {colStyle.name}
                            </span>
                          </div>
                        </div>

                        {/* Host Switch Team Button */}
                        {isHost && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleSwitchTeam(player.id, 0)}
                              className="px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/40 border border-pink-400/40 text-pink-200 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
                              title="Move to Team 2"
                            >
                              <ArrowLeftRight size={10} />
                              <span>To T2</span>
                            </button>
                            {player.isBot && (
                              <button
                                onClick={() => socketService.removeBot(room.id, player.id)}
                                className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-white/50 hover:text-rose-200 text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {team1Players.length < 2 && (
                    <div className="p-3 rounded-xl border border-dashed border-rose-400/20 text-center text-[11px] text-rose-300/40 flex items-center justify-center min-h-[46px]">
                      {isHost ? 'Drop player here or tap "To T1"' : 'Waiting for teammate...'}
                    </div>
                  )}
                </div>
              </div>

              {/* Team 2 Container */}
              <div
                onDragOver={(e) => {
                  if (isHost) {
                    e.preventDefault();
                    setDragOverTeam(1);
                  }
                }}
                onDragLeave={() => setDragOverTeam(null)}
                onDrop={(e) => isHost && handleDropOnTeam(e, 1)}
                className={`p-4 rounded-2xl border-2 transition-all min-h-[160px] flex flex-col justify-between ${
                  dragOverTeam === 1
                    ? 'border-teal-400 bg-teal-950/60 ring-2 ring-teal-400/50 scale-[1.01]'
                    : 'border-teal-500/30 bg-teal-950/20'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-teal-500/20 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🌿</span>
                    <span className="text-xs sm:text-sm font-black text-teal-300 uppercase tracking-wide">
                      Team 2 ({team2Players.length}/2)
                    </span>
                  </div>
                  <span className="text-[10px] text-teal-300/70 font-semibold">Mint & Lavender</span>
                </div>

                <div className="space-y-2 flex-1">
                  {team2Players.map((player) => {
                    const colStyle = COLOR_STYLES[player.color];
                    const isMe = player.id === myPlayer.id;

                    return (
                      <div
                        key={player.id}
                        draggable={isHost}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('playerId', player.id);
                        }}
                        onDrop={(e) => isHost && handleDropOnPlayer(e, player.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between shadow-md ${
                          isMe
                            ? 'bg-white/20 border-white/60 ring-1 ring-teal-400'
                            : `bg-slate-950/80 ${colStyle.border}`
                        } ${isHost ? 'cursor-grab active:cursor-grabbing hover:border-teal-400' : ''}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isHost && (
                            <GripVertical size={14} className="text-white/40 shrink-0" />
                          )}
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/20 shrink-0 flex items-center justify-center">
                            <AvatarImg avatar={player.avatar} alt={player.name} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-black text-white truncate max-w-[100px]">
                                {player.name}
                              </p>
                              {isMe && <span className="text-[9px] bg-teal-500/40 text-teal-200 px-1 rounded font-bold">You</span>}
                              {player.isHost && <span className="text-[9px] text-amber-300">👑</span>}
                            </div>
                            <span className={`text-[10px] font-bold ${colStyle.textColor}`}>
                              {colStyle.emoji} {colStyle.name}
                            </span>
                          </div>
                        </div>

                        {/* Host Switch Team Button */}
                        {isHost && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleSwitchTeam(player.id, 1)}
                              className="px-2 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/40 border border-teal-400/40 text-teal-200 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
                              title="Move to Team 1"
                            >
                              <ArrowLeftRight size={10} />
                              <span>To T1</span>
                            </button>
                            {player.isBot && (
                              <button
                                onClick={() => socketService.removeBot(room.id, player.id)}
                                className="p-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-white/50 hover:text-rose-200 text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {team2Players.length < 2 && (
                    <div className="p-3 rounded-xl border border-dashed border-teal-400/20 text-center text-[11px] text-teal-300/40 flex items-center justify-center min-h-[46px]">
                      {isHost ? 'Drop player here or tap "To T2"' : 'Waiting for teammate...'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard 4-Player Free-For-All Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {Array.from({ length: 4 }).map((_, index) => {
              const player = room.players[index];
              if (player) {
                const colStyle = COLOR_STYLES[player.color];
                const isMe = player.id === myPlayer.id;

                return (
                  <div
                    key={player.id}
                    className={`relative p-3.5 sm:p-4 rounded-2xl border-2 transition-all shadow-lg flex items-center justify-between ${
                      isMe
                        ? 'bg-gradient-to-br from-white/20 via-white/10 to-transparent border-white/50 ring-2 ring-pink-400/60'
                        : `bg-slate-950/80 ${colStyle.border}`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shadow-inner">
                          <AvatarImg avatar={player.avatar} alt={player.name} />
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-sm" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-[140px]">
                            {player.name}
                          </p>
                          {isMe && (
                            <span className="text-[10px] bg-pink-500/30 text-pink-200 px-1.5 py-0.2 rounded-full font-bold border border-pink-400/40">
                              You
                            </span>
                          )}
                          {player.isHost && (
                            <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded-full font-bold border border-amber-400/40">
                              👑 Host
                            </span>
                          )}
                          {player.isBot && (
                            <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded-full font-bold border border-indigo-400/40">
                              🤖 Bot
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs">{colStyle.emoji}</span>
                          <span className={`text-xs font-bold ${colStyle.textColor}`}>
                            {colStyle.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Remove bot if host */}
                    {isHost && player.isBot && (
                      <button
                        onClick={() => socketService.removeBot(room.id, player.id)}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/30 hover:border-rose-400 text-white/50 hover:text-rose-200 border border-white/10 transition-colors text-xs font-bold"
                        title="Remove AI Bot"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              }

              // Empty Slot Card
              return (
                <div
                  key={`empty-slot-${index}`}
                  className="p-3.5 sm:p-4 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] flex items-center justify-between min-h-[76px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-white/30 text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white/40">Slot #{index + 1}</p>
                      <p className="text-[11px] text-white/30">Waiting for player...</p>
                    </div>
                  </div>

                  {isHost && (
                    <button
                      onClick={() => socketService.addBot(room.id)}
                      className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-purple-500/30 border border-white/15 text-white/70 hover:text-purple-200 text-[11px] font-bold transition-all active:scale-95"
                    >
                      + Add Bot
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Choose Your Board Color */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-white/15 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>🎨 Choose Your Board Color:</span>
          </span>
          <span className={`text-xs font-bold ${COLOR_STYLES[myPlayer.color].textColor}`}>
            Currently: {COLOR_STYLES[myPlayer.color].name}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(COLOR_STYLES) as PlayerColor[]).map((col) => {
            const cfg = COLOR_STYLES[col];
            const isSelected = myPlayer.color === col;
            return (
              <button
                key={col}
                onClick={() => handleColorChange(col)}
                className={`p-2.5 rounded-2xl flex items-center gap-2 border transition-all ${
                  isSelected
                    ? `border-white ring-2 ring-pink-400 bg-white/20 scale-102 shadow-lg`
                    : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70'
                }`}
              >
                <span className="text-lg">{cfg.emoji}</span>
                <span className={`text-xs font-extrabold ${cfg.textColor}`}>{cfg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Settings (Host Controls) */}
      <div className="p-5 rounded-3xl glass-panel border border-white/15 space-y-4">
        <h3 className="text-sm font-bold text-pink-200">Atmosphere & Game Mode</h3>

        {/* Theme Picker */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-white/60">Lighting Atmosphere:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleThemeSelect('celestial')}
              className={`p-2.5 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                room.theme === 'celestial'
                  ? 'bg-purple-900/40 border-purple-400 ring-2 ring-purple-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">🌌</span>
              <span className="text-[11px] font-semibold text-white">Celestial Night</span>
            </button>

            <button
              onClick={() => handleThemeSelect('candlelight')}
              className={`p-2.5 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                room.theme === 'candlelight'
                  ? 'bg-amber-900/40 border-amber-400 ring-2 ring-amber-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">🕯️</span>
              <span className="text-[11px] font-semibold text-white">Cozy Hearth</span>
            </button>

            <button
              onClick={() => handleThemeSelect('cherry-blossom')}
              className={`p-2.5 rounded-xl flex flex-col items-center gap-1 border transition-all ${
                room.theme === 'cherry-blossom'
                  ? 'bg-pink-900/40 border-pink-400 ring-2 ring-pink-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-xl">🌸</span>
              <span className="text-[11px] font-semibold text-white">Sakura Sunset</span>
            </button>
          </div>
        </div>

        {/* Mode & Special Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Mode Toggle */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-white">Team Setup</p>
              <p className="text-[11px] text-white/60 mt-0.5">
                {room.mode === 'free-for-all-4p' && '4-Player Free For All'}
                {room.mode === 'couple-1v1' && '1v1 Match'}
                {room.mode === 'power-couple-2v2' && '2v2 Squads (Team Bond)'}
              </p>
            </div>
            {isHost && (
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => handleModeChange('free-for-all-4p')}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-semibold ${
                    room.mode === 'free-for-all-4p' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  4P Free
                </button>
                <button
                  onClick={() => handleModeChange('power-couple-2v2')}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-semibold ${
                    room.mode === 'power-couple-2v2' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  2v2 Team
                </button>
                <button
                  onClick={() => handleModeChange('couple-1v1')}
                  className={`flex-1 py-1 text-[10px] rounded-lg font-semibold ${
                    room.mode === 'couple-1v1' ? 'bg-pink-600 text-white' : 'bg-white/10 text-white/70'
                  }`}
                >
                  1v1
                </button>
              </div>
            )}
          </div>

          {/* Quick Match Toggle */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">Match Length</p>
                <span className="text-[10px] text-pink-300 font-semibold">
                  {room.quickMode ? 'Quick (2 tokens)' : 'Full (4 tokens)'}
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-0.5">
                {room.quickMode ? 'Faster pace (~10-15 mins)' : 'Classic complete match'}
              </p>
            </div>
            {isHost && (
              <button
                onClick={handleQuickToggle}
                className="mt-2 py-1 text-[11px] rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white"
              >
                Switch to {room.quickMode ? 'Full (4 tokens)' : 'Quick (2 tokens)'}
              </button>
            )}
          </div>
        </div>

        {/* Gentle / Savage Mode */}
        {isHost && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-pink-300" />
              <div>
                <p className="text-xs font-bold text-white">Gentle Mode</p>
                <p className="text-[10px] text-white/60">
                  Landing on pieces gives a gentle hug back to base instead of knock-out
                </p>
              </div>
            </div>
            <button
              onClick={handleGentleToggle}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                room.gentleMode ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/60'
              }`}
            >
              {room.gentleMode ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>

      {/* Start Game Action */}
      <div className="pt-2 text-center">
        {isHost ? (
          <button
            onClick={handleStartGame}
            className="w-full py-4 px-8 rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-extrabold text-base shadow-[0_0_30px_rgba(244,63,94,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span>🎲 Start Match / Play LUVDO</span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl glass-panel text-pink-200 text-xs font-semibold animate-pulse">
            Waiting for the Host to start the game...
          </div>
        )}
      </div>
    </div>
  );
};
