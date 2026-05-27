# Project Handoff — Portal Espiritual

Documento autocontenido para que cualquier chat futuro de Claude (Claude.ai o Claude Code) pueda recoger contexto rápido sin leer historial de chats previos.

---

## Estado actual (2026-05-27, post-launch)

- **Phase 6 LIVE en producción.** Tag `phase-6-launched` aplicado.
  Mentoría 1-a-1 funcionando con Stripe LIVE + Resend domain verified +
  Customer Portal next-gen ON.
- **Hotfix PR #1 merged** (admin UX + UUID validation + optimistic
  DB write fail-closed) — surfaced del LIVE smoke 2026-05-26.
- **Tests:** 15 test files / 51 tests PASS, tsc clean, build clean en main.
- **DB state:** 3 subscribers (JP admin + 2 historical canceled), 2
  canceled subscriptions (smoke history). Producto seeded + activo.
- **Próxima acción:** Phase 6.5 — post-launch polish + tech debt. Backlog
  en `PHASE_6_5_BACKLOG.md`. Sin compromiso de fecha.

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
SYSTEM_STATUS, PHASE_6_5_BACKLOG, PROJECT_HANDOFF.

Estado: Phase 6 LIVE (tag phase-6-launched). Trabajando en:
<pegar resumen 1-2 líneas del estado del momento>
```

Sparring chat normalmente arma prompts cerrados para Claude Code
post-discusión. Patrón ping-pong heredado de S6-S9. Documentado en
`AI_DEVELOPMENT_WORKFLOW.md`.

---

## Cómo arrancar un chat nuevo de Claude Code

```
/clear
```

Después decir literal:

```
Leé docs/SYSTEM_STATUS.md, docs/PHASE_6_5_BACKLOG.md y
docs/PROJECT_HANDOFF.md para contexto.

Trabajando en: <pegar resumen 1-2 líneas>
```

SYSTEM_STATUS captura el snapshot operacional del sistema LIVE.
PHASE_6_5_BACKLOG tiene los 12 amendments priorizados del launch.
HANDOFF (este doc) tiene workflow + anchors. Combined, suficiente
para que un chat nuevo retome sin re-explicar.

---

## Anchors clave

| Tipo | Path |
|---|---|
| Snapshot LIVE | `docs/SYSTEM_STATUS.md` |
| Backlog post-launch | `docs/PHASE_6_5_BACKLOG.md` |
| Stack + estado de alto nivel | `docs/PROJECT_CONTEXT.md` |
| Arquitectura + roadmap | `docs/ARCHITECTURE_AND_ROADMAP.md` |
| Workflow de desarrollo | `docs/AI_DEVELOPMENT_WORKFLOW.md` |
| Setup + recovery operacional | `docs/AI_SETUP_AND_WORKFLOW.md` |
| DEVLOG (newest-on-top) | `docs/DEVLOG.md` |
| Refund-reversal runbook | `docs/runbooks/refund-reversal-bug-s7-edge-1-b.md` |
| Stripe Customer Portal config | `docs/runbooks/stripe-customer-portal-config.md` |
| Project handoff (este doc) | `docs/PROJECT_HANDOFF.md` |
| Standing rules globales | `~/.claude/CLAUDE.md` |
| CLAUDE.md proyecto | `CLAUDE.md` |
| Plan Phase 6 (archivado) | `docs/archive/superpowers/plans/2026-05-13-phase-6-mentoria-implementation.md` |
| Plan hotfix (archivado) | `docs/archive/superpowers/plans/2026-05-26-hotfix-admin-ux-and-security.md` |
| Spec Phase 6 (archivado) | `docs/archive/superpowers/specs/2026-05-12-phase-6-mentoria-design.md` |
| Progress histórico S1-S10 (archivado) | `docs/archive/PHASE_6_PROGRESS.md` |
| Launch runbook (archivado) | `docs/archive/runbooks/phase-6-launch-checklist.md` |

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
| 6 (Mentoría) | **LIVE in production** (tag `phase-6-launched`, 2026-05-27) |
| 6.5 (post-launch polish) | Backlog priorizado en `PHASE_6_5_BACKLOG.md` (12 items, HIGH/MEDIUM/LOW) |
| 7 (Cursos) | Not started |
| 8 (Meditaciones) | Not started |

---

**Última actualización:** 2026-05-27 (post-launch docs cleanup)
