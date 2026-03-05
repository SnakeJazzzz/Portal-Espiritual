'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { getTwoLineConstellation } from './letterPaths';
import { siteConfig } from '@/config/services';

interface ConstellationTitleProps {
  onAnimationComplete?: () => void;
}

export default function ConstellationTitle({ onAnimationComplete }: ConstellationTitleProps) {
  const [visibleStars, setVisibleStars] = useState<Set<number>>(new Set());
  const [drawnLines, setDrawnLines] = useState<Set<number>>(new Set());
  const [isGlowing, setIsGlowing] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Generate constellation data for two lines from config
  const constellation = useMemo(
    () => getTwoLineConstellation(siteConfig.heroTitleLine1, siteConfig.heroTitleLine2, 15, 60),
    []
  );

  // Calculate viewBox with padding
  const padding = 20;
  const viewBox = `${-padding} ${-padding} ${constellation.totalWidth + padding * 2} ${
    constellation.totalHeight + padding * 2
  }`;

  // Calculate line lengths for stroke-dasharray
  const lineLengths = useMemo(
    () =>
      constellation.allConnections.map((conn) => {
        const dx = conn.toX - conn.fromX;
        const dy = conn.toY - conn.fromY;
        return Math.sqrt(dx * dx + dy * dy);
      }),
    [constellation]
  );

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Animation orchestration
  useEffect(() => {
    // Clear any existing timeouts at the start to prevent memory leaks
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    if (prefersReducedMotion) {
      // Show everything immediately for reduced motion
      setVisibleStars(new Set(constellation.allPoints.map((_, i) => i)));
      setDrawnLines(new Set(constellation.allConnections.map((_, i) => i)));
      setIsGlowing(false);

      const timeout = setTimeout(() => {
        onAnimationComplete?.();
      }, 500);
      timeoutsRef.current.push(timeout);

      // Return cleanup function for reduced motion path
      return () => {
        timeoutsRef.current.forEach(clearTimeout);
        timeoutsRef.current = [];
      };
    }

    // Phase 1: Stars appear in two waves
    // "Portal" animates 0-2s, "Espiritual" animates 1.5-3.5s with overlap

    // Separate stars into two lines based on letterIndex
    // Line 1: "Portal" (6 letters, letterIndex 0-5)
    // Line 2: "Espiritual" (10 letters, letterIndex 6-15)
    const line1Stars = constellation.allPoints
      .map((point, index) => ({ point, index }))
      .filter((star) => star.point.letterIndex < 6)
      .sort((a, b) => a.point.x - b.point.x);

    const line2Stars = constellation.allPoints
      .map((point, index) => ({ point, index }))
      .filter((star) => star.point.letterIndex >= 6)
      .sort((a, b) => a.point.x - b.point.x);

    // Animate "Portal" stars (0-2s)
    const line1Duration = 2000;
    line1Stars.forEach(({ index }, i) => {
      const baseDelay = (i / line1Stars.length) * line1Duration;
      const randomOffset = (Math.random() - 0.5) * 100;
      const delay = Math.max(0, baseDelay + randomOffset);

      const timeout = setTimeout(() => {
        setVisibleStars((prev) => new Set([...prev, index]));
      }, delay);
      timeoutsRef.current.push(timeout);
    });

    // Animate "Espiritual" stars (1.5s-3.5s)
    const line2StartDelay = 1500;
    const line2Duration = 2000;
    line2Stars.forEach(({ index }, i) => {
      const baseDelay = line2StartDelay + (i / line2Stars.length) * line2Duration;
      const randomOffset = (Math.random() - 0.5) * 100;
      const delay = Math.max(line2StartDelay, baseDelay + randomOffset);

      const timeout = setTimeout(() => {
        setVisibleStars((prev) => new Set([...prev, index]));
      }, delay);
      timeoutsRef.current.push(timeout);
    });

    // Phase 2: Lines draw after their endpoint stars appear
    constellation.allConnections.forEach((conn, lineIndex) => {
      // Determine which line this connection belongs to based on letterIndex
      const isLine1 = conn.letterIndex < 6;

      // Calculate delay based on which line the connection belongs to
      // Line 1 connections: draw during 0.5s - 2.2s
      // Line 2 connections: draw during 2.0s - 3.7s
      let lineDelay: number;

      if (isLine1) {
        // Line 1 connections spread across Portal animation
        const line1ConnectionIndex = constellation.allConnections
          .filter((c) => c.letterIndex < 6)
          .findIndex((c) => c === conn);
        const line1TotalConnections = constellation.allConnections.filter(
          (c) => c.letterIndex < 6
        ).length;
        lineDelay = 500 + (line1ConnectionIndex / line1TotalConnections) * 1700;
      } else {
        // Line 2 connections spread across Espiritual animation
        const line2ConnectionIndex = constellation.allConnections
          .filter((c) => c.letterIndex >= 6)
          .findIndex((c) => c === conn);
        const line2TotalConnections = constellation.allConnections.filter(
          (c) => c.letterIndex >= 6
        ).length;
        lineDelay = 2000 + (line2ConnectionIndex / line2TotalConnections) * 1700;
      }

      const timeout = setTimeout(() => {
        setDrawnLines((prev) => new Set([...prev, lineIndex]));
      }, lineDelay);
      timeoutsRef.current.push(timeout);
    });

    // Phase 3: Glow effect (3.5s - 4.0s)
    const glowOnTimeout = setTimeout(() => {
      setIsGlowing(true);
    }, 3500);
    timeoutsRef.current.push(glowOnTimeout);

    const glowOffTimeout = setTimeout(() => {
      setIsGlowing(false);
    }, 4000);
    timeoutsRef.current.push(glowOffTimeout);

    // Phase 4: Animation complete callback (4.0s)
    const completeTimeout = setTimeout(() => {
      onAnimationComplete?.();
    }, 4000);
    timeoutsRef.current.push(completeTimeout);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [constellation, prefersReducedMotion, onAnimationComplete]);

  return (
    <div className="w-full flex justify-center px-6 sm:px-8">
      <div className="w-[90%] sm:w-[85%] lg:w-[70%]">
        <svg
          viewBox={viewBox}
          className={`w-full h-auto transition-all duration-500 ${
            isGlowing ? 'drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]' : ''
          }`}
          role="img"
          aria-label={siteConfig.heroTitle}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* SVG Filter for star glow */}
          <defs>
            <filter id="starGlow">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Layer 1: Connection Lines */}
          <g className="lines-layer">
            {constellation.allConnections.map((conn, i) => {
              const isDrawn = drawnLines.has(i);
              const length = lineLengths[i];

              return (
                <line
                  key={`line-${i}`}
                  x1={conn.fromX}
                  y1={conn.fromY}
                  x2={conn.toX}
                  y2={conn.toY}
                  stroke="white"
                  strokeWidth="1.0"
                  opacity={isGlowing ? 0.9 : 0.6}
                  strokeDasharray={length}
                  strokeDashoffset={isDrawn ? 0 : length}
                  style={{
                    transition: 'stroke-dashoffset 0.3s ease-out, opacity 0.5s ease',
                  }}
                />
              );
            })}
          </g>

          {/* Layer 2: Star Glows */}
          <g className="glow-layer">
            {constellation.allPoints.map((point, i) => {
              const isVisible = visibleStars.has(i);

              return (
                <circle
                  key={`glow-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r="2.5"
                  fill="white"
                  opacity={isVisible ? 0.3 : 0}
                  filter="url(#starGlow)"
                  style={{
                    transform: isVisible ? 'scale(1)' : 'scale(0)',
                    transformOrigin: `${point.x}px ${point.y}px`,
                    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                  }}
                />
              );
            })}
          </g>

          {/* Layer 3: Stars (crisp dots) */}
          <g className="stars-layer">
            {constellation.allPoints.map((point, i) => {
              const isVisible = visibleStars.has(i);

              return (
                <circle
                  key={`star-${i}`}
                  cx={point.x}
                  cy={point.y}
                  r="1.2"
                  fill="white"
                  opacity={isVisible ? (isGlowing ? 1 : 0.9) : 0}
                  style={{
                    transform: isVisible ? 'scale(1)' : 'scale(0)',
                    transformOrigin: `${point.x}px ${point.y}px`,
                    transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.3s ease-out',
                  }}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
