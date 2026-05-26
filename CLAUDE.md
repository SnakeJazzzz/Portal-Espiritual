# Portal Espiritual

Landing page mística de servicios espirituales (lecturas, divinaciones, mentoría 1-a-1).
Producción en Vercel, auto-deploy desde `main`. Cliente único: Juan Pablo, guía espiritual.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript 5 strict
- Tailwind CSS v4 (theme en `src/app/globals.css` con `@theme`)
- Fuentes: Josefin Sans (headings) + Cormorant Garamond (body)
- Cal.com (`@calcom/embed-react`) para booking de servicios one-shot
- Vercel hosting, auto-deploy desde `main`

## Audiencia y constraints reales
- Tráfico principal: in-app browser de Instagram en mobile (375px primario)
- Idioma: español en todo el contenido user-facing
- Sitio estático actualmente. Cualquier feature con estado/runtime
  vive en `src/app/api/` (a partir de Phase 6)

## Arquitectura clave
- `src/config/services.ts` es **single source of truth** para todo lo
  editable por el cliente (servicios, precios, descripciones, slugs Cal.com,
  hero/about copy). No hardcodear contenido en componentes.
- Los 4 servicios actuales (Divinación de Cartas, Akáshica, Clásica,
  Activación Cuántica) usan Cal.com.
- La Mentoría 1-a-1 (Phase 6) usa Stripe Subscriptions directo, no Cal.com.
- `StarField`, `ConstellationTitle` y `CelestialBorder` son la firma visual.
  Cambios en estos requieren visual review humano.

## Convenciones
- Feature branches siempre. Nunca commits directos a `main` (hook lo bloquea).
- TypeScript strict. No `any` sin comentario justificando el porqué.
- Configuration over code: si el cliente puede querer editarlo, va en config.
- Mobile-first en clases Tailwind (base = mobile, `lg:` = desktop).
- Antes de añadir una librería: justificar tamaño bundle vs valor.

## Out of scope
- Auth de usuarios finales (admin auth para Phase 6 está OK)
- Backend separado (FastAPI, etc.). Todo en Next.js API routes.
- Librerías pesadas de animación (particles.js, three.js, framer-motion
  agresivo). Las animaciones actuales son CSS + SVG vanilla.

## Caveats importantes
- Cal.com username del cliente: `portal-espiritual`
- Stripe (Phase 6+) usa MXN. Considerar fees FX en cálculos.
- LFPDPPP (ley mexicana de protección de datos): cualquier formulario que
  recolecte datos personales necesita aviso de privacidad accesible.

## Workflow
- Design docs en `docs/superpowers/specs/`
- Task plans con TDD en `docs/superpowers/plans/`
- CHANGELOG.md histórico de phases
- Phase actual: **Phase 6 — Mentoría con suscripción mensual** (planning)

## Hooks de seguridad activos (`.claude/hooks/`)
- Bloquea writes en `main`/`master`
- Bloquea writes en `.env*`
- Bloquea `rm -rf` con paths absolutos fuera del repo
- Bloquea `git push --force`
- Bloquea clears de archivos visuales/config críticos


- `npx tsc --noEmit` con exit 0 es contract obligatorio al cierre 
     de cada gate. Cubre tests/ donde vitest no hace strict TS check 
     y next build no llega.
   
   - Empirical-first aplica a CUALQUIER afirmación técnica verificable 
     en <5min con scratch script: as any, SQL casts, library 
     workarounds, "X es necesario porque Y". Si no verificaste, no 
     lo afirmes — escribilo como suposición explícita.
   
   - Commit bodies con caracteres especiales (backticks, $, comillas) 
     → siempre `git commit -F file`, NUNCA heredoc. Shell escape 
     defensivo en heredoc quoted persiste literal en el commit.
