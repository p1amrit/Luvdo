import React, { useState } from 'react';
import { Copy, Check, Users, Shield, Mic } from 'lucide-react';
import { Room, Player, AestheticTheme, GameMode, PlayerColor } from '../types/game';
import { socketService } from '../services/socket';
import { COLOR_STYLES } from '../utils/boardCoordinates';
import { VoiceChatBar } from './VoiceChatBar';

interface LobbyViewProps {
  room: Room;
  myPlayer: Player;
  onThemeChange: (theme: AestheticTheme) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ room, myPlayer, onThemeChange }) => {
  const [copied, setCopied] = useState(false);
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

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Title & Room Code Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-300 to-purple-400">
          LUVDO
        </h1>
        <p className="text-xs sm:text-sm text-pink-200/80">
          The aesthetic real-time Ludo experience for everyone
        </p>

        {/* Shareable Room Box */}
        <div className="inline-flex items-center gap-3 px-4 py-2 mt-2 rounded-2xl glass-panel border border-pink-400/30 shadow-lg">
          <span className="text-xs text-pink-200/70">Room Code:</span>
          <span className="text-base font-black tracking-widest text-pink-300 font-mono">
            {room.id}
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/30 hover:bg-pink-500/40 text-pink-200 text-xs font-semibold transition-all active:scale-95 border border-pink-400/40"
          >
            {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Invite Link'}</span>
          </button>
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

      {/* High-Visibility Players in Room Grid */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-white/20 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-pink-400" />
            <h3 className="text-base sm:text-lg font-black text-white">
              Players in Room ({room.players.length}/4)
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

        {/* 4-Slot Dedicated Player Cards Grid */}
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
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
                        {player.avatar}
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
