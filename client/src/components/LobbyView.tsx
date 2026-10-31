import React, { useState } from 'react';
import { Copy, Check, Sparkles, HeartHandshake, Shield, Users, Heart, Coffee } from 'lucide-react';
import { Room, Player, AestheticTheme, GameMode, PlayerColor, RoomVibe } from '../types/game';
import { socketService } from '../services/socket';
import { COLOR_STYLES } from '../utils/boardCoordinates';

interface LobbyViewProps {
  room: Room;
  myPlayer: Player;
  onThemeChange: (theme: AestheticTheme) => void;
}

const ALL_MASCOTS = ['😎', '🍕', '🎮', '🚀', '🐱', '👑', '🥰', '💖', '🐰', '🐻', '🦊', '🥑', '🎧', '☕', '✨', '👻'];
const ALL_NICKNAMES = ['PixelKing', 'BobaQueen', 'ChaosGremlin', 'Honeybee', 'Capybara', 'Speedy', 'Noodle', 'Ghostie', 'Cupid', 'Sweetpea', 'Captain', 'VibeMaster'];

export const LobbyView: React.FC<LobbyViewProps> = ({ room, myPlayer, onThemeChange }) => {
  const [copied, setCopied] = useState(false);
  const [nameInput, setNameInput] = useState(myPlayer.name);
  const isHost = myPlayer.isHost;

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRandomNickname = () => {
    const rand = ALL_NICKNAMES[Math.floor(Math.random() * ALL_NICKNAMES.length)];
    setNameInput(rand);
    socketService.updateProfile(room.id, myPlayer.id, { name: rand });
  };

  const handleAvatarChange = (avatar: string) => {
    socketService.updateProfile(room.id, myPlayer.id, { avatar });
  };

  const handleColorChange = (color: PlayerColor) => {
    socketService.updateProfile(room.id, myPlayer.id, { color });
  };

  const handleNameBlur = () => {
    if (nameInput.trim()) {
      socketService.updateProfile(room.id, myPlayer.id, { name: nameInput.trim() });
    }
  };

  const handleStartGame = () => {
    socketService.startGame(room.id);
  };

  const handleVibeChange = (vibe: RoomVibe) => {
    socketService.updateRoomSettings(room.id, { vibe });
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
          The aesthetic Ludo experience for friends, besties & couples
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

      {/* Vibe Selector: Friends vs Couples vs Casual */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-white/15 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>✨ Match Vibe</span>
          </h3>
          <span className="text-xs text-pink-300 font-medium">
            {room.vibe === 'friends' && '🎉 Friends Party & Banter'}
            {room.vibe === 'couple' && '💖 Romantic Date Match'}
            {room.vibe === 'casual' && '☕ Classic Ludo & Chill Lo-Fi'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => isHost && handleVibeChange('friends')}
            disabled={!isHost}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
              room.vibe === 'friends'
                ? 'bg-gradient-to-b from-purple-600/40 to-indigo-700/50 border-purple-400 ring-2 ring-purple-400 shadow-lg'
                : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-75'
            }`}
          >
            <span className="text-2xl">🎉</span>
            <span className="text-xs font-bold text-white">Friends & Party</span>
            <span className="text-[10px] text-white/60 text-center hidden sm:inline">Fun party stickers & banter</span>
          </button>

          <button
            onClick={() => isHost && handleVibeChange('couple')}
            disabled={!isHost}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
              room.vibe === 'couple'
                ? 'bg-gradient-to-b from-pink-600/40 to-rose-700/50 border-pink-400 ring-2 ring-pink-400 shadow-lg'
                : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-75'
            }`}
          >
            <span className="text-2xl">💖</span>
            <span className="text-xs font-bold text-white">Lovers & Date</span>
            <span className="text-[10px] text-white/60 text-center hidden sm:inline">Romantic couple aesthetic</span>
          </button>

          <button
            onClick={() => isHost && handleVibeChange('casual')}
            disabled={!isHost}
            className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 border transition-all ${
              room.vibe === 'casual'
                ? 'bg-gradient-to-b from-teal-600/40 to-emerald-700/50 border-teal-400 ring-2 ring-teal-400 shadow-lg'
                : 'bg-white/5 border-white/10 hover:bg-white/10 opacity-75'
            }`}
          >
            <span className="text-2xl">☕</span>
            <span className="text-xs font-bold text-white">Chill & Casual</span>
            <span className="text-[10px] text-white/60 text-center hidden sm:inline">Pure aesthetic board night</span>
          </button>
        </div>
      </div>

      {/* Profile & Avatar Customizer */}
      <div className="p-5 rounded-3xl glass-panel border border-white/15 space-y-4">
        <h3 className="text-sm font-bold text-pink-200 flex items-center gap-2">
          <span>👤 Your Player Profile</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Avatar Display & Picker */}
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-[11px] text-white/60">Choose Mascot:</span>
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start max-w-xs">
              {ALL_MASCOTS.map((av) => (
                <button
                  key={av}
                  onClick={() => handleAvatarChange(av)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                    myPlayer.avatar === av
                      ? 'bg-pink-500/40 border-2 border-pink-400 scale-110 shadow-lg'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="flex-1 w-full space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/60">Your Nickname:</span>
              <button
                onClick={handleRandomNickname}
                className="text-[11px] text-pink-300 hover:text-pink-200 underline flex items-center gap-1"
              >
                <Sparkles size={11} /> Random cool name
              </button>
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleNameBlur}
              maxLength={20}
              className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* Color Palette Picker */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <span className="text-[11px] text-white/60">Your Board Color:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(COLOR_STYLES) as PlayerColor[]).map((col) => {
              const cfg = COLOR_STYLES[col];
              const isSelected = myPlayer.color === col;
              return (
                <button
                  key={col}
                  onClick={() => handleColorChange(col)}
                  className={`p-2 rounded-xl flex items-center gap-2 border transition-all ${
                    isSelected
                      ? `border-white ring-2 ring-pink-400 bg-white/20 scale-102 shadow-lg`
                      : 'border-white/10 bg-white/5 hover:bg-white/10 opacity-70'
                  }`}
                >
                  <span className="text-base">{cfg.emoji}</span>
                  <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Players in Room */}
      <div className="p-5 rounded-3xl glass-panel border border-white/15 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users size={16} className="text-pink-400" />
            <span>Players in Room ({room.players.length}/4)</span>
          </h3>
          <span className="text-xs text-pink-300/80">
            {room.players.length === 1 ? 'Waiting for friends to join...' : `${room.players.length} players ready`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {room.players.map((p) => {
            const colStyle = COLOR_STYLES[p.color];
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/10 border border-white/15"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{p.avatar}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white">{p.name}</p>
                      {p.isHost && (
                        <span className="text-[9px] bg-pink-500/30 text-pink-200 px-1.5 py-0.2 rounded border border-pink-400/30 font-semibold">
                          Host
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] ${colStyle.textColor}`}>
                      {colStyle.emoji} {colStyle.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-300">Online</span>
                </div>
              </div>
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
