import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';
import { ChatMessage } from '../types/game';
import { socketService } from '../services/socket';

interface TextChatDrawerProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
}

const QUICK_PHRASES = [
  'GG! 👏',
  'WHAT A ROLL! 🎲',
  'You are going down! 😈',
  'Owe me pizza/boba! 🍕',
  'Nice try! 😂',
  'Target acquired 🎯',
  'I love you 💖',
  'You look so cute 🥰',
  'Rematch after this! 🔥'
];

export const TextChatDrawer: React.FC<TextChatDrawerProps> = ({
  roomId,
  messages,
  currentUserId,
  currentUserName,
  currentUserAvatar
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    socketService.sendChatMessage(roomId, {
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text
    });

    setInputText('');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-16 right-3 sm:bottom-6 sm:right-6 z-40 p-2.5 sm:p-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border border-white/30"
        title="Open Live Chat"
      >
        <MessageCircle size={20} />
        {messages.length > 1 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] font-bold">
            {Math.min(messages.length, 9)}
          </span>
        )}
      </button>

      {/* Slide-in Chat Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 flex flex-col glass-panel bg-slate-950/85 backdrop-blur-2xl border-l border-white/20 shadow-2xl transition-all">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <h3 className="text-sm font-bold text-white">Live Room Chat</h3>
                <p className="text-[11px] text-pink-300/80">Whispers & Banter</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Phrases */}
          <div className="p-2 border-b border-white/10 flex gap-1.5 overflow-x-auto no-scrollbar py-2">
            {QUICK_PHRASES.map((phrase, i) => (
              <button
                key={i}
                onClick={() => handleSend(phrase)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-xs bg-white/10 hover:bg-pink-500/30 border border-white/15 text-pink-100 transition-colors shrink-0"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;

              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-pink-500/10 border border-pink-400/20 text-[11px] text-pink-200">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <span className="text-xl shrink-0">{msg.senderAvatar || '🥰'}</span>
                  )}
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm shadow-md ${
                      isMe
                        ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white rounded-br-none'
                        : 'bg-white/15 text-white/90 rounded-bl-none border border-white/10'
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-semibold text-pink-300 mb-0.5">
                        {msg.sender}
                      </p>
                    )}
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  </div>
                  {isMe && (
                    <span className="text-xl shrink-0">{currentUserAvatar}</span>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-white/10 flex items-center gap-2 bg-black/40"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Whisper something sweet..."
              className="flex-1 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-pink-500/50"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white disabled:opacity-40 transition-transform active:scale-90"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
