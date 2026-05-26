# Project Handoff — Portal Espiritual

Documento autocontenido para que cualquier chat futuro de Claude (Claude.ai o Claude Code) pueda recoger contexto rápido sin leer historial de chats previos.

---

## Estado actual (2026-05-25)

- **Phase 6 S10 code-complete**, 32/32 tests PASS, tsc clean, build clean
- **Smoke round 1 + round 2** end-to-end verde (validados por user en mobile 375px + desktop)
- **Launch path:** 8 PASOS documentados en `docs/runbooks/phase-6-launch-checklist.md` (sole source of truth para el flow externo)
- **Branch:** `feature/phase-6-mentoria-spec` (NO mergeado a main todavía)
- **Próxima acción:** user ejecuta los 8 PASOS del runbook fuera del chat → tag `phase-6-launched`

---

## Workflow del proyecto

- **Modelo ping-pong:** Claude.ai sparring (decisiones, review) + Claude Code (ejecución gate-by-gate)
- **Cada gate cierra con:** `tsc --noEmit` exit 0 + `npm test` PASS + smoke cuando aplica (UI changes requieren smoke end-to-end completo per lección 15 S9)
- **Pre-checks empíricos BIDIRECCIONALES** antes de cada gate (estándar establecido en S8, codificado como standing rule ~/.claude/CLAUDE.md "Empirical-first es BIDIRECCIONAL")
- **Commits con body explicativo** + cross-ref a decisiones cerradas. Heredoc rechazado para bodies con backticks/$/comillas — siempre `git commit -F /tmp/file.md`
- **Standing rules globales** en `~/.claude/CLAUDE.md` (incluye backlog hygiene verification, codificada post mini-gate 10.9)
- **Scratch scripts** en `scripts/scratch-*.ts`, NO committed, borrados tras uso
- **PII LFPDPPP:** ZERO `console.log` con datos sensibles en commits o logs estructurados

---

## Decisiones arquitectónicas durables

- **Configuration over code** — `src/config/services.ts` + `src/config/mentoria.ts` son single source of truth para contenido editable por cliente
- **Single source of truth (env vars > hardcoded)** — todo lo Stripe/Resend/DB pasa por `src/lib/env.ts` Zod schema
- **Schema genérico, lógica específica** — `products` table acepta cualquier kind, validation Stripe en config dedicada
- **Webhooks idempotentes** — `stripe_events` table con commit-at-end (`src/app/api/webhooks/stripe/route.ts`)
- **Server components donde data is server-side** — minimiza JS shipping
- **Mobile-first 375px** — Instagram in-app browser es el caso principal
- **No reescribir features previas** — añadir es OK, refactor solo con justificación clara
- **Subscriber = pagó por Stripe** — NO hay `/registro` UI; `/login` es restablecimiento de sesión, no creación de cuenta (D-10.9-4)
- **Admin auth via `role` field en `subscribers`** — `subscriber_role` pgEnum, no tabla separada. `requireAdmin()` helper en `src/lib/auth.ts:61`
- **Magic links single-use, SHA-256 hashed** — `src/lib/auth-tokens.ts` con `kind` discriminator ('welcome' | 'login') + TTL split (7d / 15min)
- **useTransition + fetch para point actions; useActionState + useFormStatus para forms** — `useFormState` deprecated en React 19.2 runtime, NUNCA usar (lección S9 Gate D)

---

## Cómo arrancar un chat nuevo de Claude.ai

Pegá literal:

```
Trabajamos en Portal Espiritual. Project knowledge cargado:
PROJECT_CONTEXT, ARCHITECTURE_AND_ROADMAP, AI_DEVELOPMENT_WORKFLOW,
spec v3, plan v2. PHASE_6_PROGRESS y PROJECT_HANDOFF.md contienen
estado actual + workflow vigente.

Estamos en: <pegar resumen 1-2 líneas del estado del momento>
```

Sparring chat normalmente arma prompts cerrados para Claude Code post-discusión. Patrón ping-pong heredado de S6-S9.

---

## Cómo arrancar un chat nuevo de Claude Code

```
/clear
```

Después decir literal:

```
Leé docs/PHASE_6_PROGRESS.md y docs/PROJECT_HANDOFF.md para contexto.
Estamos en: <pegar resumen 1-2 líneas>
```

PHASE_6_PROGRESS tiene history completo de S1-S10 + decisiones aplicadas + items deferred. HANDOFF (este doc) tiene workflow + anchors. Combined, son suficiente para que un chat nuevo retome.

---

## Anchors clave

| Tipo | Path |
|---|---|
| Plan completo Phase 6 | `docs/superpowers/plans/2026-05-13-phase-6-mentoria-implementation.md` |
| Spec v3 Phase 6 | `docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md` |
| Progress histórico | `docs/PHASE_6_PROGRESS.md` |
| Launch runbook (8 PASOS) | `docs/runbooks/phase-6-launch-checklist.md` |
| Refund bug runbook | `docs/runbooks/refund-reversal-bug-s7-edge-1-b.md` |
| DEVLOG histórico | `docs/DEVLOG.md` |
| Stripe Customer Portal config | `docs/stripe-customer-portal-config.md` |
| Project handoff (este doc) | `docs/PROJECT_HANDOFF.md` |
| Standing rules globales | `~/.claude/CLAUDE.md` |
| CLAUDE.md proyecto | `CLAUDE.md` |

---

## Cómo es el repo (architecture quick reference)

- **Stack:** Next 16.1.6 (App Router) + React 19.2.3 + TypeScript 5 strict + Tailwind v4 + Drizzle ORM + Neon serverless Postgres + Stripe SDK 17.7 + Resend
- **Auth:** session cookie `pe_session` (HTTPOnly, 30-day TTL) + magic link via Stripe email (welcome) o user-initiated POST `/api/auth/login` (login)
- **DB:** single Neon `main` branch compartida entre dev local + producción Vercel (DATABASE_URL_TEST split deferred a 6.5)
- **Tests:** Vitest integration, 32 tests en 12 archivos, beforeEach TRUNCATE en setup.ts (no unit tests — todos integration con DB real)
- **Deploy:** Vercel auto-deploy desde `main` push. Prebuild hook corre `drizzle-kit migrate` (safe — no seeds, no tests)
- **Env vars Vercel prod:** 8 vars Zod-validated (ver `src/lib/env.ts`). 5 vars DEAD en `.env.local` que NO van a prod (cleanup deferred a 6.5)

---

## Comandos críticos del developer

```bash
# Tests (vitest no auto-carga .env.local)
node --env-file=.env.local ./node_modules/.bin/vitest run

# Build local (workaround necesario por --env-file rechazado por Next workers + & en DATABASE_URL rompe bash sourcing)
node --env-file=.env.local -e "require('child_process').execSync('npm run build', {stdio: 'inherit'})"

# Seed admin JP (manual, no hook automático)
node --env-file=.env.local ./node_modules/.bin/tsx scripts/seed-admin.ts

# Cleanup pre-launch (dry-run + real)
node --env-file=.env.local ./node_modules/.bin/tsx scripts/scratch-pre-launch-cleanup.ts --dry-run
node --env-file=.env.local ./node_modules/.bin/tsx scripts/scratch-pre-launch-cleanup.ts

# tsc strict check (al cierre de cada gate)
npx tsc --noEmit
```

---

## Status snapshot per Phase

| Phase | Status |
|---|---|
| 1-5 | Pre-Phase-6 stack (services, divinations, etc.) — live |
| 6 (Mentoría) | S1-S10 code-complete, awaiting 8-step launch externo |
| 6.5 (post-launch polish) | Backlog acumulado (DATABASE_URL_TEST split, H2 log-out-all-devices, dev quirks, polish, etc.) |
| 7 (Cursos) | Not started |
| 8 (Meditaciones) | Not started |

---

**Última actualización:** 2026-05-25 (pre-clear consolidation, S10 PRE-LAUNCH READY)
