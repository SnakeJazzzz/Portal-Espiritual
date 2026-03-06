'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type React from 'react';

// Configuration constants
const STAR_CONFIG = {
  DESKTOP_COUNT: 250,
  MOBILE_COUNT: 120,
  MOBILE_BREAKPOINT: 768, // px
  SIZES: [1, 2, 3] as const, // px
  TWINKLE_DELAY_MAX: 8, // seconds
  TWINKLE_DURATION_MIN: 3, // seconds
  TWINKLE_DURATION_RANGE: 4, // 3-7s total
  TWINKLE_OFF_CHANCE: 0.15, // 15% of stars
  OPACITY_MIN: 0.3, // For static stars
  OPACITY_RANGE: 0.7, // 0.3-1.0 total
} as const;

const SHOOTING_STAR_CONFIG = {
  LENGTH_MIN: 80, // px
  LENGTH_RANGE: 70, // 80-150px total
  DISTANCE_MIN: 200, // px
  DISTANCE_RANGE: 200, // 200-400px total
  INITIAL_DELAY_MIN: 3000, // ms
  INITIAL_DELAY_RANGE: 2000, // 3-5s total
  INTERVAL: 30000, // ms (30 seconds)
} as const;

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  animationDelay: number;
  animationDuration: number;
  useTwinkleOff: boolean;
  opacity: number; // For static stars when prefers-reduced-motion
}

interface ShootingStar {
  id: number;
  x: number;
  y: number;
  length: number;
  angle: number;
  translateX: number;
  translateY: number;
}

// Extend CSSProperties to support custom CSS properties
interface CustomCSSProperties extends React.CSSProperties {
  '--twinkle-duration'?: string;
  '--translate-x'?: string;
  '--translate-y'?: string;
}

// Helper function to generate stars (defined outside component)
function generateStarsInitial(isMobile: boolean): Star[] {
  const starCount = isMobile ? STAR_CONFIG.MOBILE_COUNT : STAR_CONFIG.DESKTOP_COUNT;
  const generatedStars: Star[] = [];

  for (let i = 0; i < starCount; i++) {
    generatedStars.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: STAR_CONFIG.SIZES[Math.floor(Math.random() * STAR_CONFIG.SIZES.length)],
      animationDelay: Math.random() * STAR_CONFIG.TWINKLE_DELAY_MAX,
      animationDuration:
        Math.random() * STAR_CONFIG.TWINKLE_DURATION_RANGE + STAR_CONFIG.TWINKLE_DURATION_MIN,
      useTwinkleOff: Math.random() < STAR_CONFIG.TWINKLE_OFF_CHANCE,
      opacity: Math.random() * STAR_CONFIG.OPACITY_RANGE + STAR_CONFIG.OPACITY_MIN,
    });
  }

  return generatedStars;
}

export default function StarField() {
  const [mounted, setMounted] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const shootingStarIdRef = useRef(0);

  // Generate stars based on screen size
  const generateStars = useCallback((isMobile: boolean) => {
    const starCount = isMobile ? STAR_CONFIG.MOBILE_COUNT : STAR_CONFIG.DESKTOP_COUNT;
    const generatedStars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      generatedStars.push({
        id: i,
        x: Math.random() * 100, // 0-100%
        y: Math.random() * 100, // 0-100%
        size: STAR_CONFIG.SIZES[Math.floor(Math.random() * STAR_CONFIG.SIZES.length)],
        animationDelay: Math.random() * STAR_CONFIG.TWINKLE_DELAY_MAX,
        animationDuration:
          Math.random() * STAR_CONFIG.TWINKLE_DURATION_RANGE + STAR_CONFIG.TWINKLE_DURATION_MIN,
        useTwinkleOff: Math.random() < STAR_CONFIG.TWINKLE_OFF_CHANCE,
        opacity: Math.random() * STAR_CONFIG.OPACITY_RANGE + STAR_CONFIG.OPACITY_MIN,
      });
    }

    return generatedStars;
  }, []);

  // Generate a shooting star from random edge with realistic trajectory
  const createShootingStar = useCallback(() => {
    // Randomize trail length
    const length =
      Math.random() * SHOOTING_STAR_CONFIG.LENGTH_RANGE + SHOOTING_STAR_CONFIG.LENGTH_MIN;

    // Randomize travel distance
    const distance =
      Math.random() * SHOOTING_STAR_CONFIG.DISTANCE_RANGE + SHOOTING_STAR_CONFIG.DISTANCE_MIN;

    // Pick a random spawn edge: 0 = top, 1 = left, 2 = top-right
    const edge = Math.floor(Math.random() * 3);

    let x: number, y: number, angle: number;

    if (edge === 0) {
      // Top edge - travels downward-diagonally to the right
      x = Math.random() * 100; // Anywhere along top
      y = Math.random() * 10; // Top 10%
      angle = Math.random() * 30 + 30; // 30-60 degrees (down-right)
    } else if (edge === 1) {
      // Left edge - travels right-diagonally downward
      x = Math.random() * 10; // Left 10%
      y = Math.random() * 60; // Upper-middle area
      angle = Math.random() * 30 + 45; // 45-75 degrees (right-down)
    } else {
      // Top-right area - travels left-diagonally downward
      x = Math.random() * 20 + 80; // Right 20%
      y = Math.random() * 20; // Top 20%
      angle = Math.random() * 30 + 120; // 120-150 degrees (down-left)
    }

    // Calculate translate values based on angle (convert to radians)
    const angleRad = (angle * Math.PI) / 180;
    const translateX = distance * Math.cos(angleRad);
    const translateY = distance * Math.sin(angleRad);

    const newShootingStar: ShootingStar = {
      id: ++shootingStarIdRef.current,
      x,
      y,
      length,
      angle,
      translateX,
      translateY,
    };
    setShootingStars((prev) => [...prev, newShootingStar]);
  }, []);

  // Remove shooting star from state after animation
  const removeShootingStar = useCallback((id: number) => {
    setShootingStars((prev) => prev.filter((star) => star.id !== id));
  }, []);

  // Initial setup: generate stars, detect motion preference, handle resize
  useEffect(() => {
    // Defer state updates to avoid synchronous setState in effect
    const timeout = setTimeout(() => {
      // Mark component as mounted
      setMounted(true);

      // Check for prefers-reduced-motion
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      // Generate stars based on initial screen size
      const isMobile = window.innerWidth < STAR_CONFIG.MOBILE_BREAKPOINT;
      setStars(generateStarsInitial(isMobile));
    }, 0);

    // Listen for changes to motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPrefChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleMotionPrefChange);

    // Handle window resize with debouncing
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const currentIsMobile = window.innerWidth < STAR_CONFIG.MOBILE_BREAKPOINT;
        const previousIsMobile = stars.length === STAR_CONFIG.MOBILE_COUNT;

        // Only regenerate if we crossed the threshold
        if (currentIsMobile !== previousIsMobile) {
          setStars(generateStars(currentIsMobile));
        }
      }, 300); // 300ms debounce
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeout);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleMotionPrefChange);
    };
  }, [generateStars, stars.length]);

  // Trigger initial shooting star after 3-5 seconds (skip if reduced motion)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const initialDelay =
      Math.random() * SHOOTING_STAR_CONFIG.INITIAL_DELAY_RANGE +
      SHOOTING_STAR_CONFIG.INITIAL_DELAY_MIN;
    const timer = setTimeout(() => {
      createShootingStar();
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [prefersReducedMotion, createShootingStar]);

  // Periodic shooting stars every ~30 seconds (skip if reduced motion)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      createShootingStar();
    }, SHOOTING_STAR_CONFIG.INTERVAL);

    return () => clearInterval(interval);
  }, [prefersReducedMotion, createShootingStar]);

  // Don't render stars until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Rotating Container - Twinkling Stars (or static if reduced motion) */}
      <div
        className={prefersReducedMotion ? '' : 'animate-celestial-rotate'}
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '120%',
          height: '120%',
        }}
      >
        {stars.map((star) => {
          const starStyle: CustomCSSProperties = {
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: 'white',
            borderRadius: '50%',
            opacity: prefersReducedMotion ? star.opacity : undefined,
            animationDelay: prefersReducedMotion ? undefined : `${star.animationDelay}s`,
            '--twinkle-duration': prefersReducedMotion
              ? undefined
              : `${star.animationDuration}s`,
          };

          return (
            <div
              key={star.id}
              className={
                prefersReducedMotion
                  ? ''
                  : star.useTwinkleOff
                  ? 'animate-twinkle-off'
                  : 'animate-twinkle'
              }
              style={starStyle}
            />
          );
        })}
      </div>

      {/* Shooting Stars Layer - Non-rotating (none if reduced motion) */}
      {!prefersReducedMotion && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {shootingStars.map((shootingStar) => {
            const shootingStarStyle: CustomCSSProperties = {
              position: 'absolute',
              left: `${shootingStar.x}%`,
              top: `${shootingStar.y}%`,
              width: `${shootingStar.length}px`,
              height: '2px',
              // Gradient: transparent (tail) → white (head) so bright end leads
              background: 'linear-gradient(to right, transparent, white)',
              // Apply rotation to match travel direction
              transform: `rotate(${shootingStar.angle}deg)`,
              transformOrigin: 'left center',
              // CSS custom properties for animation translate values
              '--translate-x': `${shootingStar.translateX}px`,
              '--translate-y': `${shootingStar.translateY}px`,
            };

            return (
              <div
                key={shootingStar.id}
                className="animate-shooting-star"
                style={shootingStarStyle}
                onAnimationEnd={() => removeShootingStar(shootingStar.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
