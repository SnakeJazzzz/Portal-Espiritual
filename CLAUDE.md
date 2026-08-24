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
- Specs y plans (TDD) de la fase ACTIVA viven en `docs/superpowers/`
  (`specs/` y `plans/`); al completarse una fase se archivan a
  `docs/archive/superpowers/` y el dir activo se recrea cuando arranca
  la siguiente fase
- CHANGELOG.md histórico de phases
- Phase 6 (Mentoría) **lanzada y en producción** desde 2026-05-27
  (tag `phase-6-launched`)
- Fase 1 (catálogo Divinación) **lanzada** 2026-08-24 (tag
  `fase-1-catalogo`)
- Siguiente: **Fase 2 — Sadhana** (`docs/PLAN_CATALOGO_Y_SADHANA.md`),
  pendiente de arranque; empieza por el slice S0 (ambientes)
- **Migraciones:** toda migración se aplica a AMBOS branches de Neon.
  Después de `drizzle-kit generate`, correr siempre los dos comandos:
  `db:migrate` (main/prod) y `db:migrate:test` (branch test), ambos via
  `node --env-file=.env.local ./node_modules/.bin/drizzle-kit migrate
  [--config=drizzle.config.test.ts]`. Una migración aplicada solo a main
  hace que la suite de integración corra contra schema viejo y falle por
  razones falsas.

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

   - **Destructive tests: aislamiento activo desde el merge `1f9cc89`
     (2026-08-21, backlog DI-1).** La suite corre contra el Neon branch
     `test` vía `DATABASE_URL_TEST` (sin fallback):
     `tests/integration/env-guard.ts` aborta antes de abrir conexión
     alguna si falta la var, si falta `ALLOW_DESTRUCTIVE_TESTS=true`,
     o si el host de test coincide con el de `DATABASE_URL`. La regla
     manual previa ("verificá DATABASE_URL antes de correr vitest")
     quedó automatizada por esos guards; no los debilites ni los
     reordenes. Antecedente: 2 incidentes de truncate de prod
     recuperables durante el ciclo de hotfix 2026-05-26/27.

   - **Path patterns con corchetes necesitan single-quote en zsh.**
     `git add 'src/app/admin/[id]/page.tsx'` — sin las comillas, zsh
     glob-expande `[id]` y falla con "no matches found". Aplica a
     cualquier comando que toque rutas dinámicas de Next.js o
     archivos con `[...]` en el nombre.

   - **Post-feature filesystem hygiene:** después de mergear a `main`
     una feature que usó `/superpowers:subagent-driven-development`,
     limpiar los worktrees:
     ```bash
     git worktree prune
     rm -rf .claude/worktrees/
     ```
     Los worktrees están en `.gitignore` pero acumulan en filesystem
     local + en `git branch` output. La limpieza es parte del
     feature-completion checklist.
