# Changelog

All notable changes to the Portal Espiritual project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 2 - Star Field Background (March 4, 2026)

#### Added
- **StarField Component** (`src/components/StarField.tsx`)
  - Animated twinkling stars with randomized positions, sizes, and timing
  - 250 stars on desktop, 120 stars on mobile devices (<768px)
  - Slow celestial rotation animation (750-second cycle)
  - Shooting star effects appearing every ~30 seconds from random edges
  - Realistic shooting star trajectories with angle-based movement
  - Gradient effect on shooting stars (transparent tail to bright head)
  - Two twinkle animation variants (standard and twinkle-off)
  - TypeScript interfaces for Star and ShootingStar objects
  - Custom CSS properties interface for type-safe styling

- **Responsive Optimization**
  - Automatic star count adjustment based on viewport width
  - Window resize handler with 300ms debouncing
  - Threshold-based regeneration (only when crossing mobile/desktop breakpoint)

- **Accessibility Features**
  - Full `prefers-reduced-motion` media query support
  - Real-time motion preference change detection
  - Static star rendering when animations are disabled
  - Shooting stars completely disabled for reduced-motion preference
  - Proper `aria-hidden="true"` on decorative elements

- **Animation Keyframes** (in `src/app/globals.css`)
  - `@keyframes twinkle`: Standard opacity pulse animation
  - `@keyframes twinkle-off`: Pulse with blackout period
  - `@keyframes shooting-star`: CSS custom property-based translation with fade
  - `@keyframes celestial-rotate`: 360-degree rotation over 750 seconds

- **Tailwind v4 Theme Configuration**
  - Custom animation definitions in `@theme` block
  - Support for CSS custom properties in animations

#### Changed
- Updated `src/app/page.tsx` to include StarField component
- Enhanced `src/app/globals.css` with star field animations and theme config
- Improved code quality by extracting all magic numbers to named constants
- Replaced `@ts-ignore` comments with proper TypeScript typing

#### Fixed
- Shooting star visual bug: reversed gradient direction so bright head leads
- TypeScript warnings by creating `CustomCSSProperties` interface
- Performance issue on window resize with debouncing and threshold checks
- Memory leaks by properly cleaning up event listeners in useEffect hooks

#### Technical Improvements
- Wrapped all functions in `useCallback` to prevent unnecessary re-renders
- Replaced `Date.now()` ID generation with counter-based IDs
- Added media query listener for real-time motion preference updates
- Implemented proper transform origin for shooting star rotation

---

### Phase 1 - Project Setup (March 3, 2026)

#### Added
- **Project Initialization**
  - Next.js 16 with App Router
  - React 19
  - TypeScript 5 with strict mode
  - Tailwind CSS v4 with PostCSS
  - ESLint 9 with Next.js config
  - React Compiler (Babel plugin 1.0.0)
  - Cal.com embed package for booking integration

- **Project Structure**
  - `/src/app/` directory for Next.js App Router
  - `/src/components/` directory for React components
  - `/docs/` directory for documentation

- **Styling Foundation**
  - Custom color palette for spiritual/mystical theme:
    - Portal Black (#050510)
    - Portal Indigo (#0F0A2E)
    - Portal Violet (#2D1B69)
    - Portal Gold (#C9A84C)
    - Portal Text (#E8E0F3)
  - Custom font families: Space Grotesk (headings), Outfit (body)
  - Custom scrollbar styling
  - Smooth scroll behavior

- **Configuration Files**
  - `package.json`: Dependencies and scripts
  - `tsconfig.json`: TypeScript configuration
  - `next.config.ts`: Next.js configuration
  - `.gitignore`: Git ignore rules

#### Technical Stack
- Node.js package management with npm
- Git version control
- Vercel deployment ready

---

## Version History

- **Phase 2** (2026-03-04): Star Field Background - COMPLETED
- **Phase 1** (2026-03-03): Project Setup - COMPLETED

---

*This changelog documents all phases of development for the Portal Espiritual landing page.*
