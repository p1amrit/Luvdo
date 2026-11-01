import React from 'react';

interface BorderTimerProps {
  percent: number; // 0 to 100
  className?: string;
  urgent?: boolean;
}

export const BorderTimer: React.FC<BorderTimerProps> = ({ percent, className = '', urgent = false }) => {
  // Color dynamically shifts from emerald green to amber to bright rose red
  const strokeColor =
    percent > 50
      ? '#34d399' // Emerald
      : percent > 25
      ? '#f59e0b' // Amber
      : '#f43f5e'; // Rose / Red

  const isCritical = percent <= 25;

  return (
    <svg
      className={`absolute -inset-[3px] w-[calc(100%+6px)] h-[calc(100%+6px)] pointer-events-none overflow-visible z-20 ${
        isCritical ? 'animate-pulse' : ''
      } ${className}`}
    >
      {/* Background track */}
      <rect
        x="1.5"
        y="1.5"
        rx="999"
        fill="none"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="2"
        style={{ width: 'calc(100% - 3px)', height: 'calc(100% - 3px)' }}
      />
      {/* Running countdown border */}
      <rect
        x="1.5"
        y="1.5"
        rx="999"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        pathLength="100"
        strokeDasharray="100"
        strokeDashoffset={100 - Math.max(0, Math.min(100, percent))}
        strokeLinecap="round"
        style={{
          width: 'calc(100% - 3px)',
          height: 'calc(100% - 3px)',
          filter: `drop-shadow(0 0 6px ${strokeColor})`,
          transition: 'stroke-dashoffset 0.08s linear, stroke 0.3s ease'
        }}
      />
    </svg>
  );
};
