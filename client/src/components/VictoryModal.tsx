import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Player, RoomVibe } from '../types/game';
import { sounds } from '../services/soundEffects';
import { socketService } from '../services/socket';

interface VictoryModalProps {
  winner: Player;
  byForfeit?: boolean;
  myPlayerId: string;
  roomId: string;
  vibe?: RoomVibe;
  onPlayAgain: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  byForfeit = false,
  myPlayerId,
  roomId,
  vibe = 'friends',
  onPlayAgain
}) => {
  const isMe = winner.id === myPlayerId;
  const [loveNote, setLoveNote] = useState('');
  const [sentNote, setSentNote] = useState<string | null>(null);

  useEffect(() => {
    sounds.playVictoryChime();

    // Fire celebration confetti
    const duration = 3.5 * 1000;
    const animationEnd = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 65,
        origin: { x: 0 },
        colors: ['#38bdf8', '#ec4899', '#a855f7', '#fbbf24', '#10b981']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 65,
        origin: { x: 1 },
        colors: ['#38bdf8', '#ec4899', '#a855f7', '#fbbf24', '#10b981']
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const handleSendLoveNote = () => {
    if (!loveNote.trim()) return;
    setSentNote(loveNote);
    const prefix = vibe === 'couple' ? '🏆 VICTORY LOVE NOTE' : '🏆 CHAMPION DEMAND';
    socketService.sendChatMessage(roomId, {
      senderId: myPlayerId,
      senderName: winner.name,
      senderAvatar: winner.avatar,
      text: `${prefix}: "${loveNote}"`
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-purple-950 to-slate-950 border-2 border-pink-400/40 shadow-[0_0_60px_rgba(244,63,94,0.7)] text-center text-white">
        {/* Crown and Trophy */}
        <div className="text-5xl mb-2 animate-bounce">
          👑
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-yellow-200 to-purple-300">
          {isMe
            ? (byForfeit ? '🏆 You Won! Opponent Left the Game' : 'You Won the Game!')
            : (byForfeit ? `🏆 ${winner.name} Won! Opponent Left` : `${winner.name} is the Champion!`)}
        </h2>

        <p className="text-sm text-pink-200/90 mt-1 mb-6">
          {byForfeit
            ? 'The opponent left the match — victory and bragging rights belong to you!'
            : isMe
            ? (vibe === 'couple'
                ? 'All 4 tokens reached the Love Sanctuary! Claim your romantic prize below.'
                : 'All 4 tokens home! Claim your bragging rights or snack tax.')
            : (vibe === 'couple'
                ? 'A wonderful date match! Time to pamper the winner with love.'
                : 'Good game all! Winner takes all the glory.')}
        </p>

        {/* Winner Avatar Card */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/10 border border-white/20 mb-6 shadow-inner">
          <span className="text-3xl">{winner.avatar}</span>
          <div className="text-left">
            <p className="text-sm font-bold text-white">{winner.name}</p>
            <p className="text-xs text-yellow-300 font-medium">Ludo Grand Champion</p>
          </div>
        </div>

        {/* Victory Note Section */}
        {isMe ? (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/15 text-left mb-6">
            <label className="block text-xs font-semibold text-pink-300 mb-2">
              {vibe === 'couple'
                ? '💌 Write a Victory Love Note or Claim a Voucher:'
                : '🏆 Claim Your Winner Reward (e.g. Free Boba/Pizza, Favor):'}
            </label>
            {sentNote ? (
              <p className="text-sm text-emerald-300 italic">
                "{sentNote}" (Broadcasted to the room!)
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loveNote}
                  onChange={(e) => setLoveNote(e.target.value)}
                  placeholder={
                    vibe === 'couple'
                      ? 'e.g., I claim a 20-min massage & dinner treat! 🥰'
                      : 'e.g., You all owe me boba and pizza! 🍕🧋'
                  }
                  className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  onClick={handleSendLoveNote}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-xs font-bold transition-all"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/15 text-center mb-6">
            <p className="text-xs text-pink-200 italic">
              "GG! Ready for revenge in the next round?" 🔥
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-sm shadow-xl transition-transform active:scale-95"
          >
            Play Again / Next Round
          </button>
        </div>
      </div>
    </div>
  );
};
