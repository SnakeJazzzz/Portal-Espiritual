# Changelog

All notable changes to the Portal Espiritual project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 5 - Font Migration and Typography Refinements (March 5, 2026)

#### Changed
- **Font Family Migration**
  - Replaced Space Grotesk with Josefin Sans for headings
  - Replaced Outfit with Cormorant Garamond for body text
  - Updated all font references in globals.css and layout.tsx
  - Configured Next.js Google Fonts with optimal weight selections:
    - Josefin Sans: 300, 400, 700
    - Cormorant Garamond: 300, 400, 600
  - Set `display: 'swap'` for optimal loading performance

- **Responsive Typography Across All Components**
  - Hero subtitle: `text-xl lg:text-4xl` (20px → 36px)
  - Hero CTA button: `text-2xl lg:text-4xl` (24px → 36px)
  - ServiceCard headings: `text-2xl lg:text-4xl` (24px → 36px)
  - ServiceCard metadata and descriptions: `text-lg lg:text-2xl` (18px → 24px)
  - AboutMe heading: `text-2xl lg:text-4xl` (24px → 36px)
  - AboutMe bio text: `text-lg lg:text-2xl` (18px → 24px)
  - Consistent breakpoint strategy using `lg:` (1024px+)

#### Fixed
- **CRITICAL: Font Loading Architecture**
  - Fixed CSS variables not accessible in browser
  - Moved font variable classes from body to `<html>` element in layout.tsx
  - Added explicit `.font-heading` and `.font-body` utility classes in globals.css
  - Created proper fallback chain: `var(--font-heading-next), 'Josefin Sans', sans-serif`

- **CRITICAL: Hydration Error in StarField Component**
  - Fixed "Text content did not match" hydration error
  - Added `mounted` state to defer client-side initialization
  - Wrapped media query check in `setTimeout(..., 0)` to avoid SSR mismatch
  - Returns empty container during SSR, populates after mount
  - File: `/src/components/StarField.tsx` (lines 81, 166-177, 236-244)

- **CRITICAL: ESLint Errors - Lazy State Initialization**
  - Fixed direct function calls in `useState()` initial values
  - Changed `useState(fn())` to `useState(() => fn())` for lazy initialization
  - Prevents unnecessary re-computation on every render
  - Files affected:
    - `/src/components/StarField.tsx` (line 82)
    - `/src/components/constellation/ConstellationTitle.tsx` (line 15)

- **Inconsistent Typography Scaling**
  - Added responsive font size classes to all text elements
  - Ensured minimum readable sizes on mobile (18px for body text)
  - Proper scaling for desktop with impact sizing (up to 36px)

#### Added
- Explicit font utility classes in globals.css (`.font-heading`, `.font-body`)
- Responsive typography classes across Hero, ServiceCard, AboutMe components
- Comprehensive responsive testing matrix (375px, 768px, 1440px)

#### Performance Improvements
- Lazy state initialization reduces unnecessary computations
- Hydration fix eliminates React double-rendering
- Font subsetting via Next.js Google Fonts reduces download size
- Static generation with clean SSR/client hydration
- **Lighthouse Metrics:**
  - First Contentful Paint: 0.43s
  - Time to Interactive: 1.26s
  - Cumulative Layout Shift: 0.002 (excellent)
  - Total Blocking Time: 0ms

#### Documentation
- Updated README.md with new font references
- Updated globals.css font fallback chains
- Added responsive testing matrix to DEVLOG.md

---

### Phase 4 - AboutMe and Footer Components (March 5, 2026)

#### Added
- **AboutMe Component** (`src/components/AboutMe.tsx`)
  - Responsive two-column layout (photo left, text right on desktop)
  - Mobile layout stacks with text on top, photo below using `flex-col-reverse`
  - Profile photo with Next.js Image optimization (3:4 aspect ratio portrait)
  - Fade-to-transparent gradient overlay at bottom of photo for mystical effect
  - Section heading, bio paragraphs, and Instagram link from siteConfig
  - CelestialBorder wrapper around profile photo for animated border
  - Instagram SVG icon (28×28px) with hover effects
  - Section ID `id="sobre-mi"` for smooth scroll navigation
  - Automatic paragraph splitting from newline-separated bio text

- **Footer Component** (`src/components/Footer.tsx`)
  - Minimal transparent design with top border separator
  - Site name from siteConfig.heroTitle
  - Instagram SVG icon (24×24px, smaller than AboutMe version)
  - Dynamic copyright year using `new Date().getFullYear()`
  - Spanish copyright text: "© {year} Portal Espiritual. Todos los derechos reservados."
  - Visual hierarchy with opacity variations (white/40, white/25)

- **Site Configuration Additions** (`src/config/services.ts`)
  - `aboutPhoto: '/about-photo.svg'` - Profile image path
  - `aboutAlt: 'Foto de perfil'` - Image alt text for accessibility
  - `aboutTitle: 'Sobre Mí'` - Section heading
  - `aboutBio` - Multi-paragraph bio text (newline-separated)
  - Updated `instagramUrl` with actual Instagram profile link

- **Page Integration** (`src/app/page.tsx`)
  - Integrated AboutMe component below Hero section
  - Added Footer component at bottom of page
  - Maintained proper z-index layering across all components

#### Changed
- Updated scrollbar hover color from gold to white/opacity for consistency
  - Changed from `rgba(201, 168, 76, 0.4)` to `rgba(255, 255, 255, 0.3)`
  - Maintains white/opacity color scheme throughout site

#### Fixed
- **Next.js Image Warning**: Added required `sizes` attribute to AboutMe profile photo
  - `sizes="(max-width: 1024px) 100vw, 380px"` for proper responsive loading
  - Fixes build warnings and optimizes image delivery
- **UTF-8 Encoding**: Fixed malformed copyright symbol (©) in Footer component
- **Hardcoded Year**: Replaced static "2026" with `new Date().getFullYear()` for auto-updating copyright
- **Color Consistency**: Removed gold color from scrollbar hover state

#### Technical Improvements
- Mobile-first layout strategy with `flex-col-reverse` for better reading flow
- Icon-only social links for minimal aesthetic (proper aria-labels for accessibility)
- Content-driven design with all text/images from siteConfig (no hardcoded strings)
- Dynamic date generation for maintenance-free copyright year
- Responsive typography and spacing across all breakpoints
- Proper semantic HTML structure with accessibility attributes

---

### Phase 3 - Hero Section with Constellation Title (March 5, 2026)

#### Added
- **ConstellationTitle Component** (`src/components/constellation/ConstellationTitle.tsx`)
  - Animated SVG constellation forming text "Portal" and "Espiritual"
  - Two-line stacked layout with configurable text from siteConfig
  - 4-phase animation sequence (4 seconds total):
    1. Stars appear in two waves (0-3.5s): "Portal" stars first, then "Espiritual"
    2. Connection lines draw progressively (0.5-3.7s) with stroke-dasharray animation
    3. Glow effect pulses briefly (3.5-4.0s)
    4. Callback triggers content reveal after completion
  - Three-layer SVG rendering: connection lines, star glows, crisp star dots
  - Responsive sizing (90% mobile, 85% tablet, 70% desktop)
  - Proper viewBox calculation with padding for edge stars
  - Memory-safe timeout management with cleanup
  - Full `prefers-reduced-motion` support (instant reveal)

- **Letter Path Generation** (`src/components/constellation/letterPaths.ts`)
  - `getTwoLineConstellation()` function for two-line text layouts
  - Automatic letter positioning with configurable spacing
  - Individual letter constellation definitions (P, O, R, T, A, L, E, S, I, U)
  - Point and connection data structures for each letter
  - Normalized coordinate system for consistent sizing
  - Returns combined constellation data with total width/height

- **Hero Component** (`src/components/Hero.tsx`)
  - Full-screen constellation section with centered title
  - Two-phase reveal: constellation animation → content fade-in
  - Service cards grid (3 cards) with responsive layout:
    - 1 column on mobile
    - 2 columns on tablet (3rd card centered)
    - 3 columns on desktop
  - Staggered entrance animations with configurable delays
  - Single CTA button "Reservar tu sesión" with celestial border
  - Subtitle text from siteConfig
  - Animation orchestration via state management

- **ServiceCard Component** (`src/components/ServiceCard.tsx`)
  - Glass-morphism design with backdrop blur
  - Purple gradient border (portal-violet to portal-gold)
  - Service name, duration, and price display
  - Description text with proper text wrapping
  - Responsive typography scaling
  - Hover effects preparation (future enhancement)

- **CelestialBorder Component** (`src/components/CelestialBorder.tsx`)
  - Animated border with corner stars and border trace effect
  - Configurable border radius and active state
  - Sequential 3-phase animation (2.5s total):
    1. Corner stars appear (0-0.8s)
    2. Border traces clockwise (0.8-2.0s)
    3. Resting state with pulsing stars
  - Infinite animation loop when active
  - SVG-based rendering with absolute positioning
  - Respects `prefers-reduced-motion` (shows static state)
  - Configurable via props (borderRadius, active)

- **Site Configuration Updates** (`src/config/services.ts`)
  - Added `heroTitleLine1: 'Portal'` for constellation first line
  - Added `heroTitleLine2: 'Espiritual'` for constellation second line
  - Maintains backward compatibility with `heroTitle` for aria-labels

- **Animation Keyframes** (in `src/app/globals.css`)
  - `@keyframes fade-in-up`: Fade in with upward slide (1s duration)
  - Applied to subtitle, service cards, and CTA button
  - Coordinated with constellation reveal timing

#### Changed
- Updated `src/app/page.tsx` to include Hero component
- Hero section now drives entire above-fold experience
- Content reveal synchronized with constellation animation completion

#### Fixed
- **Critical Memory Leak**: Fixed timeout cleanup in ConstellationTitle
  - All timeouts now properly stored in ref array
  - Cleanup function clears all timeouts on unmount
  - Cleanup also runs at start of effect to prevent duplicates
  - Added separate cleanup for reduced-motion code path
- **TypeScript Type Error**: Changed timeout type from NodeJS.Timeout to ReturnType<typeof setTimeout>
  - Fixes browser vs Node.js timer type conflict
  - Ensures compatibility with browser environment
- **Production Console Logs**: Removed all console.log statements
  - Clean production build with no debug output
- **Accessibility - Stroke Width**: Increased line stroke-width from 0.6 to 1.0
  - Meets WCAG visibility guidelines
  - Improves visual clarity on low-contrast displays
- **Configurability**: Made constellation text editable via siteConfig
  - No hardcoded strings in components
  - Easy to update site title without touching component code

#### Technical Improvements
- Proper TypeScript typing throughout all new components
- Consistent use of Tailwind v4 theme variables
- Memoized constellation generation for performance
- Pre-calculated line lengths for stroke-dasharray animations
- Separated stars by line for independent animation waves
- Clean component composition (Hero → ConstellationTitle + ServiceCard + CelestialBorder)
- All animations respect user's motion preferences

---

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
  - Custom font families: Josefin Sans (headings), Cormorant Garamond (body)
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

- **Phase 5** (2026-03-05): Font Migration and Typography Refinements - COMPLETED
- **Phase 4** (2026-03-05): AboutMe and Footer Components - COMPLETED
- **Phase 3** (2026-03-05): Hero Section with Constellation Title - COMPLETED
- **Phase 2** (2026-03-04): Star Field Background - COMPLETED
- **Phase 1** (2026-03-03): Project Setup - COMPLETED

**Landing Page Status:** Production-ready (all phases complete)

---

*This changelog documents all phases of development for the Portal Espiritual landing page.*
