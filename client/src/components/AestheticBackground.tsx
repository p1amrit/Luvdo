import React, { useMemo } from 'react';
import { AestheticTheme } from '../types/game';

interface AestheticBackgroundProps {
  theme: AestheticTheme;
  children: React.ReactNode;
}

export const AestheticBackground: React.FC<AestheticBackgroundProps> = ({ theme, children }) => {
  // Generate random twinkling stars for celestial theme
  const stars = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2
    }));
  }, []);

  // Generate floating petals or bokeh
  const floatingParticles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 12 + 8,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 6
    }));
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white transition-colors duration-1000 select-none">
      {/* Dynamic Background Base Layer */}
      {theme === 'celestial' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#070814] via-[#0f1123] to-[#18112c] -z-20">
          {/* Subtle Nebula glows */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Twinkling stars */}
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white shadow-sm pointer-events-none animate-pulse"
              style={{
                top: `${star.y}%`,
                left: `${star.x}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
                opacity: 0.75
              }}
            />
          ))}
        </div>
      )}

      {theme === 'candlelight' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#120907] via-[#1c100c] to-[#28150c] -z-20">
          {/* Warm fireplace/candle glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Warm Bokeh circles */}
          {floatingParticles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-amber-400/20 blur-sm pointer-events-none"
              style={{
                bottom: '-20px',
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animation: `floatUp ${p.duration}s linear infinite`,
                animationDelay: `${p.delay}s`
              }}
            />
          ))}
        </div>
      )}

      {theme === 'cherry-blossom' && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#170919] via-[#240e24] to-[#120614] -z-20">
          {/* Sunset Rose Glow */}
          <div className="absolute -top-20 -right-20 w-[30rem] h-[30rem] bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[30rem] h-[30rem] bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Floating Sakura Petals */}
          {floatingParticles.map((p) => (
            <div
              key={p.id}
              className="absolute pointer-events-none opacity-60"
              style={{
                top: '-20px',
                left: `${p.left}%`,
                fontSize: `${p.size}px`,
                animation: `floatUp ${p.duration}s ease-in-out infinite reverse`,
                animationDelay: `${p.delay}s`
              }}
            >
              🌸
            </div>
          ))}
        </div>
      )}

      {/* Foreground Content */}
      <div className="relative z-10 w-full min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
};
