import React, { useState } from 'react';
import { Copy, Check, Users, Shield, Mic, ArrowLeftRight, GripVertical, Sparkles } from 'lucide-react';
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
  const voicePlayers = room.players.filter(p => room.voicePlayerIds?.includes(p.id));

  return (
    <div className="w-full max-w-xl mx-auto p-3 sm:p-5 space-y-4">
      {/* Clean Header Bar: Room Code + Copy + WhatsApp */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-purple-300 tracking-tight">
          LUVDO
        </h1>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl glass-panel border border-white/20 shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">Room:</span>
            <span className="text-sm font-black tracking-widest text-pink-300 font-mono">
              {room.id}
            </span>
          </div>

          <div className="h-4 w-px bg-white/20 mx-0.5" />

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-pink-200 text-xs font-semibold transition-all active:scale-95"
            title="Copy room link"
          >
            {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-bold transition-all active:scale-95 border border-emerald-400/40"
            title="Share via WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" className="shrink-0 text-emerald-300">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.59 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.36 7.33 8.1 7.4 7.87 7.64C7.65 7.88 7.03 8.47 7.03 9.68C7.03 10.89 7.91 12.06 8.03 12.22C8.16 12.39 9.73 14.81 12.18 15.86C14.22 16.74 14.63 16.56 15.08 16.52C15.53 16.48 16.53 15.93 16.74 15.35C16.94 14.77 16.94 14.27 16.88 14.17C16.82 14.07 16.66 14.01 16.42 13.89C16.18 13.77 15 13.19 14.77 13.11C14.54 13.03 14.38 12.99 14.22 13.23C14.05 13.47 13.58 14.01 13.44 14.17C13.3 14.33 13.16 14.35 12.92 14.23C12.68 14.11 11.91 13.86 10.99 13.04C10.28 12.4 9.8 11.61 9.66 11.37C9.52 11.13 9.65 11 9.77 10.88C9.88 10.77 10.02 10.59 10.14 10.45C10.26 10.31 10.3 10.21 10.38 10.05C10.46 9.89 10.42 9.75 10.36 9.63C10.3 9.51 9.83 8.35 9.63 7.88C9.44 7.42 9.24 7.48 9.09 7.47C8.95 7.47 8.79 7.33 8.53 7.33Z"/>
            </svg>
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Impressive Live Voice Lounge with Joined Avatars */}
      <div className="p-3 sm:p-3.5 rounded-3xl glass-panel border border-emerald-400/30 shadow-lg bg-gradient-to-r from-emerald-950/40 via-slate-950/60 to-purple-950/40 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Live Voice Status & Joined Avatars */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Mic size={18} className="animate-pulse" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-slate-950" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white tracking-wide">
                  Live Voice
                </span>
                {voicePlayers.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {voicePlayers.length} {voicePlayers.length === 1 ? 'Online' : 'Connected'}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/50 font-medium">Ready</span>
                )}
              </div>

              {/* Impressive Overlapping Joined Avatars Stack */}
              {voicePlayers.length > 0 ? (
                <div className="flex items-center gap-2 pt-1.5">
                  <div className="flex -space-x-2.5 overflow-hidden items-center py-0.5">
                    {voicePlayers.map((vp) => (
                      <div
                        key={vp.id}
                        className="relative group cursor-pointer transition-transform hover:scale-110 hover:z-20"
                        title={`${vp.name} (In Voice)`}
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-emerald-400 bg-slate-900 overflow-hidden shadow-[0_0_10px_rgba(52,211,153,0.45)]">
                          <AvatarImg avatar={vp.avatar} alt={vp.name} className="w-full h-full object-cover" />
                        </div>
                        {/* Live Mic mini-badge on avatar */}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-1.5 ring-slate-950 flex items-center justify-center">
                          <Mic size={7} className="text-white" />
                        </span>
                      </div>
                    ))}
                  </div>

                  <span className="text-[11px] text-emerald-200/90 font-semibold truncate max-w-[140px] sm:max-w-[220px]">
                    {voicePlayers.map(p => p.id === myPlayer.id ? 'You' : p.name).join(', ')}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-white/60 truncate pt-0.5">
                  Tap <span className="text-emerald-300 font-semibold">Join Voice</span> to talk with players
                </p>
              )}
            </div>
          </div>

          {/* Right: Join / Mute / Leave Controls */}
          <div className="shrink-0 flex items-center justify-end">
            <VoiceChatBar
              roomId={room.id}
              playerId={myPlayer.id}
              players={room.players}
              voicePlayerIds={room.voicePlayerIds}
            />
          </div>
        </div>
      </div>

      {/* Players Section */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-white/20 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-pink-400" />
            <h3 className="text-sm sm:text-base font-black text-white">
              {is2v2Mode ? '2v2 Teams' : `Players (${room.players.length}/4)`}
            </h3>
          </div>

          {isHost && room.players.length < 4 && (
            <button
              onClick={() => socketService.addBot(room.id)}
              className="px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            >
              <span>+ Add Bot</span>
            </button>
          )}
        </div>

        {/* 2v2 Mode Team Zones */}
        {is2v2Mode ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Team 1 */}
            <div
              onDragOver={(e) => {
                if (isHost) {
                  e.preventDefault();
                  setDragOverTeam(0);
                }
              }}
              onDragLeave={() => setDragOverTeam(null)}
              onDrop={(e) => isHost && handleDropOnTeam(e, 0)}
              className={`p-3 rounded-2xl border transition-all ${
                dragOverTeam === 0
                  ? 'border-pink-400 bg-pink-950/50'
                  : 'border-rose-500/30 bg-rose-950/20'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-500/20 mb-2">
                <span className="text-xs font-black text-rose-300 uppercase tracking-wide">
                  💖 Team 1 ({team1Players.length}/2)
                </span>
                <span className="text-[10px] text-rose-300/70 font-semibold">Rose & Peach</span>
              </div>

              <div className="space-y-1.5">
                {team1Players.map((player) => {
                  const colStyle = COLOR_STYLES[player.color];
                  const isMe = player.id === myPlayer.id;

                  return (
                    <div
                      key={player.id}
                      draggable={isHost}
                      onDragStart={(e) => e.dataTransfer.setData('playerId', player.id)}
                      onDrop={(e) => isHost && handleDropOnPlayer(e, player.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        isMe ? 'bg-white/15 border-white/50' : 'bg-slate-950/70 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isHost && <GripVertical size={13} className="text-white/30 shrink-0" />}
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 shrink-0">
                          <AvatarImg avatar={player.avatar} alt={player.name} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white truncate max-w-[90px]">{player.name}</span>
                            {isMe && <span className="text-[9px] bg-pink-500/40 text-pink-200 px-1 rounded font-bold">You</span>}
                            {player.isHost && <span className="text-[9px] text-amber-300">👑</span>}
                          </div>
                          <span className={`text-[10px] font-bold ${colStyle.textColor}`}>
                            {colStyle.emoji} {colStyle.name}
                          </span>
                        </div>
                      </div>

                      {isHost && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSwitchTeam(player.id, 0)}
                            className="px-1.5 py-0.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/40 text-pink-200 text-[10px] font-bold"
                            title="Move to Team 2"
                          >
                            To T2
                          </button>
                          {player.isBot && (
                            <button
                              onClick={() => socketService.removeBot(room.id, player.id)}
                              className="p-1 text-white/40 hover:text-rose-300 text-xs"
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
                  <div className="p-2.5 rounded-xl border border-dashed border-rose-400/20 text-center text-[10px] text-rose-300/40">
                    Waiting for player...
                  </div>
                )}
              </div>
            </div>

            {/* Team 2 */}
            <div
              onDragOver={(e) => {
                if (isHost) {
                  e.preventDefault();
                  setDragOverTeam(1);
                }
              }}
              onDragLeave={() => setDragOverTeam(null)}
              onDrop={(e) => isHost && handleDropOnTeam(e, 1)}
              className={`p-3 rounded-2xl border transition-all ${
                dragOverTeam === 1
                  ? 'border-teal-400 bg-teal-950/50'
                  : 'border-teal-500/30 bg-teal-950/20'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-teal-500/20 mb-2">
                <span className="text-xs font-black text-teal-300 uppercase tracking-wide">
                  🌿 Team 2 ({team2Players.length}/2)
                </span>
                <span className="text-[10px] text-teal-300/70 font-semibold">Mint & Purple</span>
              </div>

              <div className="space-y-1.5">
                {team2Players.map((player) => {
                  const colStyle = COLOR_STYLES[player.color];
                  const isMe = player.id === myPlayer.id;

                  return (
                    <div
                      key={player.id}
                      draggable={isHost}
                      onDragStart={(e) => e.dataTransfer.setData('playerId', player.id)}
                      onDrop={(e) => isHost && handleDropOnPlayer(e, player.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        isMe ? 'bg-white/15 border-white/50' : 'bg-slate-950/70 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isHost && <GripVertical size={13} className="text-white/30 shrink-0" />}
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 shrink-0">
                          <AvatarImg avatar={player.avatar} alt={player.name} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white truncate max-w-[90px]">{player.name}</span>
                            {isMe && <span className="text-[9px] bg-teal-500/40 text-teal-200 px-1 rounded font-bold">You</span>}
                            {player.isHost && <span className="text-[9px] text-amber-300">👑</span>}
                          </div>
                          <span className={`text-[10px] font-bold ${colStyle.textColor}`}>
                            {colStyle.emoji} {colStyle.name}
                          </span>
                        </div>
                      </div>

                      {isHost && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleSwitchTeam(player.id, 1)}
                            className="px-1.5 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/40 text-teal-200 text-[10px] font-bold"
                            title="Move to Team 1"
                          >
                            To T1
                          </button>
                          {player.isBot && (
                            <button
                              onClick={() => socketService.removeBot(room.id, player.id)}
                              className="p-1 text-white/40 hover:text-rose-300 text-xs"
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
                  <div className="p-2.5 rounded-xl border border-dashed border-teal-400/20 text-center text-[10px] text-teal-300/40">
                    Waiting for player...
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Standard Free-For-All Cards Grid */
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => {
              const player = room.players[index];
              if (player) {
                const colStyle = COLOR_STYLES[player.color];
                const isMe = player.id === myPlayer.id;

                return (
                  <div
                    key={player.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                      isMe ? 'bg-white/15 border-white/50' : 'bg-slate-950/70 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 shrink-0">
                        <AvatarImg avatar={player.avatar} alt={player.name} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white truncate max-w-[80px] sm:max-w-[100px]">
                            {player.name}
                          </span>
                          {isMe && <span className="text-[9px] bg-pink-500/30 text-pink-200 px-1 rounded font-bold">You</span>}
                          {player.isHost && <span className="text-[9px] text-amber-300">👑</span>}
                        </div>
                        <span className={`text-[10px] font-bold ${colStyle.textColor}`}>
                          {colStyle.emoji} {colStyle.name}
                        </span>
                      </div>
                    </div>

                    {isHost && player.isBot && (
                      <button
                        onClick={() => socketService.removeBot(room.id, player.id)}
                        className="p-1 text-white/40 hover:text-rose-300 text-xs font-bold"
                        title="Remove Bot"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={`empty-slot-${index}`}
                  className="p-2.5 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-between"
                >
                  <span className="text-xs text-white/40 font-semibold">Slot #{index + 1}</span>
                  {isHost && (
                    <button
                      onClick={() => socketService.addBot(room.id)}
                      className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-[10px] font-bold"
                    >
                      + Bot
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Choose Your Color */}
      <div className="p-3.5 sm:p-4 rounded-3xl glass-panel border border-white/15 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/90">Your Color:</span>
          <span className={`text-xs font-bold ${COLOR_STYLES[myPlayer.color].textColor}`}>
            {COLOR_STYLES[myPlayer.color].emoji} {COLOR_STYLES[myPlayer.color].name}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(COLOR_STYLES) as PlayerColor[]).map((col) => {
            const cfg = COLOR_STYLES[col];
            const isSelected = myPlayer.color === col;
            return (
              <button
                key={col}
                onClick={() => handleColorChange(col)}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 border transition-all ${
                  isSelected
                    ? 'border-white bg-white/20 shadow-md ring-2 ring-pink-400/60'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70'
                }`}
              >
                <span className="text-sm">{cfg.emoji}</span>
                <span className={`text-xs font-bold ${cfg.textColor}`}>{cfg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Host Match Settings */}
      {isHost ? (
        <div className="p-3.5 sm:p-4 rounded-3xl glass-panel border border-white/15 space-y-3">
          <span className="text-xs font-bold text-white/90">Match Settings:</span>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/10">
            <button
              onClick={() => handleModeChange('free-for-all-4p')}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                room.mode === 'free-for-all-4p' ? 'bg-indigo-600 text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              4-Player
            </button>
            <button
              onClick={() => handleModeChange('power-couple-2v2')}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                room.mode === 'power-couple-2v2' ? 'bg-purple-600 text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              2v2 Teams
            </button>
            <button
              onClick={() => handleModeChange('couple-1v1')}
              className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                room.mode === 'couple-1v1' ? 'bg-pink-600 text-white shadow-md' : 'text-white/60 hover:text-white'
              }`}
            >
              1v1
            </button>
          </div>

          {/* Quick Match & Gentle Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleQuickToggle}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                room.quickMode ? 'border-amber-400/60 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-white/70'
              }`}
            >
              <span>Match Pace:</span>
              <span className="text-[11px] font-extrabold">{room.quickMode ? 'Quick (2)' : 'Full (4)'}</span>
            </button>

            <button
              onClick={handleGentleToggle}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                room.gentleMode ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200' : 'border-white/10 bg-white/5 text-white/70'
              }`}
            >
              <span>Gentle Mode:</span>
              <span className="text-[11px] font-extrabold">{room.gentleMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Theme Selector */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { id: 'celestial', icon: '🌌', label: 'Celestial' },
              { id: 'candlelight', icon: '🕯️', label: 'Hearth' },
              { id: 'cherry-blossom', icon: '🌸', label: 'Sakura' }
            ].map((th) => (
              <button
                key={th.id}
                onClick={() => handleThemeSelect(th.id as AestheticTheme)}
                className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 border text-xs font-bold transition-all ${
                  room.theme === th.id
                    ? 'border-white bg-white/20 shadow-md ring-1 ring-pink-400/50 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <span>{th.icon}</span>
                <span>{th.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Start Game Action */}
      <div className="pt-1 text-center">
        {isHost ? (
          <button
            onClick={handleStartGame}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-black text-sm shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles size={17} />
            <span>Start Game</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-2xl glass-panel text-pink-200 text-xs font-semibold animate-pulse text-center">
            Waiting for Host to start...
          </div>
        )}
      </div>
    </div>
  );
};
