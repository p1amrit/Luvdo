import React, { useMemo } from 'react';
import { AestheticTheme } from '../types/game';

interface AestheticBackgroundProps {
  theme: AestheticTheme;
  children: React.ReactNode;
}

export const AestheticBackground: React.FC<AestheticBackgroundProps> = ({ theme, children }) => {
  // Lightweight stars count for maximum GPU efficiency on low-end mobile devices
  const stars = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => ({
      id: i,
      x: Math.round(Math.random() * 96 + 2),
      y: Math.round(Math.random() * 96 + 2),
      size: Math.random() > 0.6 ? 2 : 1.5,
      duration: Math.round((Math.random() * 2 + 3) * 10) / 10,
      delay: Math.round(Math.random() * 2 * 10) / 10
    }));
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white select-none">
      {/* Dynamic Background Base Layer - Pure GPU radial-gradients (Zero blur-3xl overhead) */}
      {theme === 'celestial' && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#070814] via-[#0f1123] to-[#18112c] -z-20 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 12% 15%, rgba(147, 51, 234, 0.18) 0%, transparent 48%),
              radial-gradient(circle at 88% 85%, rgba(225, 29, 72, 0.14) 0%, transparent 48%),
              radial-gradient(circle at 50% 45%, rgba(59, 130, 246, 0.08) 0%, transparent 40%)
            `
          }}
        >
          {/* Subtle twinkling stars */}
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white/80 pointer-events-none animate-pulse"
              style={{
                top: `${star.y}%`,
                left: `${star.x}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
                willChange: 'opacity'
              }}
            />
          ))}
        </div>
      )}

      {theme === 'candlelight' && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#120907] via-[#1c100c] to-[#28150c] -z-20 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 25%, rgba(245, 158, 11, 0.16) 0%, transparent 50%),
              radial-gradient(circle at 85% 90%, rgba(234, 88, 12, 0.15) 0%, transparent 45%)
            `
          }}
        />
      )}

      {theme === 'cherry-blossom' && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#170919] via-[#240e24] to-[#120614] -z-20 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 85% 15%, rgba(236, 72, 153, 0.18) 0%, transparent 48%),
              radial-gradient(circle at 15% 85%, rgba(244, 63, 94, 0.15) 0%, transparent 48%)
            `
          }}
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
