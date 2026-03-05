'use client';

import { useState } from 'react';

interface CelestialBorderProps {
  children: React.ReactNode;
  className?: string;
  borderRadius?: string;
  active?: boolean;
}

export default function CelestialBorder({
  children,
  className = '',
  borderRadius = '1rem',
  active = false,
}: CelestialBorderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showEffect = active || isHovered;

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ borderRadius }}
    >
      {/* Border Effects Container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ borderRadius }}
      >
        {/* Corner Stars */}
        <div
          className={`absolute w-1 h-1 bg-white rounded-full transition-all duration-500 ${
            showEffect ? 'opacity-100 animate-celestial-star-pulse' : 'opacity-0'
          }`}
          style={{ top: '-2px', left: '-2px' }}
        />
        <div
          className={`absolute w-1 h-1 bg-white rounded-full transition-all duration-500 ${
            showEffect ? 'opacity-100 animate-celestial-star-pulse' : 'opacity-0'
          }`}
          style={{ top: '-2px', right: '-2px', animationDelay: '0.1s' }}
        />
        <div
          className={`absolute w-1 h-1 bg-white rounded-full transition-all duration-500 ${
            showEffect ? 'opacity-100 animate-celestial-star-pulse' : 'opacity-0'
          }`}
          style={{ bottom: '-2px', right: '-2px', animationDelay: '0.2s' }}
        />
        <div
          className={`absolute w-1 h-1 bg-white rounded-full transition-all duration-500 ${
            showEffect ? 'opacity-100 animate-celestial-star-pulse' : 'opacity-0'
          }`}
          style={{ bottom: '-2px', left: '-2px', animationDelay: '0.3s' }}
        />

        {/* Border Trace - Top Edge */}
        <div
          className={`absolute top-0 left-0 right-0 h-px overflow-hidden ${
            showEffect ? 'animate-border-trace-top' : 'opacity-0'
          }`}
        >
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>

        {/* Border Trace - Right Edge */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-px overflow-hidden ${
            showEffect ? 'animate-border-trace-right' : 'opacity-0'
          }`}
        >
          <div className="w-full h-full bg-gradient-to-b from-transparent via-white to-transparent" />
        </div>

        {/* Border Trace - Bottom Edge */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-px overflow-hidden ${
            showEffect ? 'animate-border-trace-bottom' : 'opacity-0'
          }`}
        >
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent" />
        </div>

        {/* Border Trace - Left Edge */}
        <div
          className={`absolute top-0 left-0 bottom-0 w-px overflow-hidden ${
            showEffect ? 'animate-border-trace-left' : 'opacity-0'
          }`}
        >
          <div className="w-full h-full bg-gradient-to-b from-transparent via-white to-transparent" />
        </div>

        {/* Subtle Static Border (appears after animation) */}
        <div
          className={`absolute inset-0 border border-white transition-opacity duration-500 ${
            showEffect ? 'opacity-10 delay-[2s]' : 'opacity-0'
          }`}
          style={{ borderRadius }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
