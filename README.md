# Portal Espiritual

Landing page mística de servicios espirituales para el cliente Juan Pablo
(guía espiritual). Production en
[`portalespiritual.com.mx`](https://portalespiritual.com.mx) via Vercel,
auto-deploy desde `main`.

## Estado

- **Phases 1-5** — 4 servicios one-shot (Divinación de Cartas, Akáshica,
  Clásica, Activación Cuántica) agendados via Cal.com. Live.
- **Phase 6** — Mentoría 1-a-1 con suscripción mensual ($2,222 MXN, 8 spots
  máximo). **Live desde 2026-05-27** (tag `phase-6-launched`). Stripe LIVE,
  Resend dominio verificado, admin panel funcional.
- **Phase 6.5** — Post-launch polish + tech debt. Ver
  [`docs/PHASE_6_5_BACKLOG.md`](docs/PHASE_6_5_BACKLOG.md).

Para el snapshot operacional completo:
[`docs/SYSTEM_STATUS.md`](docs/SYSTEM_STATUS.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 strict · Tailwind CSS v4 ·
Drizzle ORM · Neon serverless Postgres · Stripe Subscriptions · Resend ·
Vercel hosting.

## Local dev

```bash
npm install
cp .env.example .env.local   # rellenar con credenciales (pedir al maintainer)
npm run dev                  # http://localhost:3000
```

### Tests + typecheck

```bash
npx tsc --noEmit
ALLOW_DESTRUCTIVE_TESTS=true node --env-file=.env.local ./node_modules/.bin/vitest run
```

> **⚠️ Importante:** los integration tests truncan tablas. `.env.local`
> actualmente apunta al Neon `main` branch compartido con producción
> ([HIGH/DI-1 en backlog](docs/PHASE_6_5_BACKLOG.md)). Verificá
> `DATABASE_URL` no apunte a prod antes de correr destructive tests. La
> standing rule está en [`CLAUDE.md`](CLAUDE.md).

## Project structure

```
.
├── src/
│   ├── app/              # Next.js App Router (pages + api routes)
│   ├── components/       # React components (incluye admin/ Phase 6)
│   ├── config/           # services.ts + mentoria.ts (single source of truth)
│   ├── db/               # Drizzle client + schema + migrations
│   ├── lib/              # env, auth, stripe, email, audit, rate-limit, uuid
│   └── middleware.ts     # session + admin gating
├── tests/
│   ├── unit/             # pure helpers (uuid)
│   └── integration/      # against Neon, 15 files / 51 tests
├── docs/
│   ├── SYSTEM_STATUS.md             # operational snapshot (LIVE)
│   ├── PHASE_6_5_BACKLOG.md         # next work, prioritized
│   ├── ARCHITECTURE_AND_ROADMAP.md  # high-level architecture
│   ├── PROJECT_CONTEXT.md           # project knowledge for Claude.ai
│   ├── PROJECT_HANDOFF.md           # first prompt for new chats
│   ├── AI_DEVELOPMENT_WORKFLOW.md   # how we work day-to-day
│   ├── AI_SETUP_AND_WORKFLOW.md     # setup + recovery procedures
│   ├── DEVLOG.md                    # chronological newest-on-top
│   ├── runbooks/                    # active ops runbooks
│   └── archive/                     # historical: completed plans,
│                                    # specs, progress, launch runbook
├── scripts/              # one-off seed + maintenance scripts
├── .claude/hooks/        # Claude Code safety hooks
├── CLAUDE.md             # repo standing rules (loaded each session)
└── CHANGELOG.md          # historical change log
```

## Documentation

| Doc | Read it when |
|---|---|
| [`docs/SYSTEM_STATUS.md`](docs/SYSTEM_STATUS.md) | You need to know what's running in prod |
| [`docs/PHASE_6_5_BACKLOG.md`](docs/PHASE_6_5_BACKLOG.md) | You're starting Phase 6.5 work |
| [`docs/PROJECT_HANDOFF.md`](docs/PROJECT_HANDOFF.md) | You're opening a new Claude chat |
| [`docs/AI_DEVELOPMENT_WORKFLOW.md`](docs/AI_DEVELOPMENT_WORKFLOW.md) | You want to know how we work day-to-day |
| [`docs/AI_SETUP_AND_WORKFLOW.md`](docs/AI_SETUP_AND_WORKFLOW.md) | Something broke and you need recovery |
| [`docs/runbooks/`](docs/runbooks/) | An active operational procedure (Stripe portal, refund-reversal) |
| [`docs/archive/`](docs/archive/) | You want to know why a Phase 6 decision was made |

## Conventions

- Feature branches always — never commit directly to `main` (hook blocks).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- TypeScript strict, no `any` without justification comment.
- Configuration over code: editable-by-client content goes in
  `src/config/*`.
- Mobile-first (`base = mobile, lg: = desktop`). Instagram in-app browser
  at 375px is the primary case.
- Spanish for all user-facing content.

## License

Proprietary. Single client (Juan Pablo).
