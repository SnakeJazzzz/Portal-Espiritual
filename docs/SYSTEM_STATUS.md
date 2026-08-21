# Portal Espiritual — System Status (LIVE)

> **Snapshot operacional del sistema en producción.** Última actualización:
> 2026-05-27. Replaces the pre-launch `PHASE_6_LAUNCH_STATUS.md`
> (archived). Update this doc whenever the live runtime state changes
> (env flip, infra swap, new external service, etc.) — not on every
> code merge.

---

## TL;DR

Portal Espiritual está live en `https://portalespiritual.com.mx` con
Phases 1-6 funcionales:

- Phases 1-5: 4 servicios one-shot agendados via Cal.com.
- Phase 6: Mentoría 1-a-1 con suscripción mensual Stripe LIVE en
  `$2,222 MXN/mes`. Tag `phase-6-launched` aplicado 2026-05-27.

---

## Stack runtime activo

| Capa | Tech | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router) | `next 16.1.6` en `package.json` |
| Runtime | React 19 | `react 19.2.3` |
| Lenguaje | TypeScript 5 strict | No `any` sin justificación explícita |
| Styling | Tailwind CSS v4 | Theme en `src/app/globals.css` con `@theme` |
| Fuentes | Josefin Sans (heading) + Cormorant Garamond (body) | next/font Google Fonts |
| Booking one-shot | Cal.com (`@calcom/embed-react`) | Phase 1-5 únicamente |
| DB | Neon serverless Postgres + Drizzle ORM 0.36 | Single `main` branch (split a `tests` branch pendiente, ver `PHASE_6_5_BACKLOG.md`) |
| Pagos | Stripe Subscriptions, SDK `stripe 17.7` | LIVE keys, MXN, API version `2026-02-25.clover` |
| Email | Resend `resend 4.8` | Dominio `portalespiritual.com.mx` verified (DKIM + SPF) |
| Validación runtime | Zod 3.25 | `src/lib/env.ts` valida 7 env vars required + 1 opcional |
| Hosting | Vercel | Auto-deploy desde `main` push |

---

## Stripe LIVE — configuración canónica

| Componente | Valor |
|---|---|
| Mode | LIVE |
| Product ID | `prod_UaL3x5TrS6pv6B` (Mentoría 1-a-1) |
| Price ID activo | `price_1TbANALoQFUZpragoscEMVVK` ($2,222 MXN/mes recurring) |
| Webhook destination | `we_1TbAtKLoQFUZprag5melpCZk` (phase-6-mentoria-live) |
| Webhook URL canónica | `https://www.portalespiritual.com.mx/api/webhooks/stripe` |
| Webhook API version | `2026-02-25.clover` |
| Events suscritos | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |
| Customer Portal | next-gen experience ON |
| Portal cancellations | "End of billing period" (no immediate-cancel) |
| Portal disabled features | plan switch, quantity change, pause, business info update, email update, shipping update, tax ID update |
| Portal return URL | `https://portalespiritual.com.mx/cuenta` |

**Important:** la URL del webhook DEBE usar el subdomain `www`. El apex
domain (`portalespiritual.com.mx`) causa 307 redirects que rompen TODAS
las entregas de webhook silenciosamente (Stripe ve 200 OK del redirect
endpoint, el handler real nunca corre).

Detalle operacional del Customer Portal (qué togglear, cómo verificar):
`docs/runbooks/stripe-customer-portal-config.md`.

---

## Resend — configuración canónica

| Componente | Valor |
|---|---|
| Titularidad | Cuenta del cliente (JP): `akasha.infinito8@gmail.com`, específica para Portal Espiritual (login en el perfil de Chrome de JP) |
| Dominio | `portalespiritual.com.mx` (verified) |
| DKIM + SPF | Green |
| Sender | `hola@portalespiritual.com.mx` |
| Welcome email TTL | 7 días (magic link kind=`welcome`) |
| Login email TTL | 15 min (magic link kind=`login`) |
| Single-use enforcement | Sí, en `src/lib/auth-tokens.ts` |

Resend no separa test/live keys — la misma API key trabaja para ambos.

---

## Vercel env vars (Production scope)

8 vars Zod-required en `src/lib/env.ts` + 1 opcional:

| Variable | Required | Sensitive | Notas |
|---|---|---|---|
| `DATABASE_URL` | Sí | Sí | Neon integration auto-set |
| `APP_URL` | Sí | No | `https://portalespiritual.com.mx` |
| `STRIPE_SECRET_KEY` | Sí | Sí | LIVE (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Sí | Sí | LIVE (`whsec_...` del webhook destination above) |
| `STRIPE_PRICE_ID_MENTORIA` | Sí | No | `price_1TbANALoQFUZpragoscEMVVK` |
| `RESEND_API_KEY` | Sí | Sí | LIVE |
| `RESEND_FROM_EMAIL` | Sí | No | `hola@portalespiritual.com.mx` |
| `ADMIN_SEED_EMAIL` | No | No | Email de JP para seed inicial de admin |

**Preview scope:** actualmente NO tiene mirrored vars — toda PR/preview
deploy falla en el `prebuild` (drizzle-kit migrate transitively calls
`getEnv()`, which Zod-validates all 7 required). Fix en
`PHASE_6_5_BACKLOG.md` (MEDIUM/DX). Workaround actual: smoke directo
contra main post-merge.

---

## DB schema (Neon, Drizzle)

Single Neon branch `main` compartido entre local dev y production. Split
a `DATABASE_URL_TEST` deferred a Phase 6.5 (HIGH/data-integrity #1).

Tablas (ver `src/db/schema.ts` para definición canónica):

| Tabla | Propósito |
|---|---|
| `products` | Single source: Mentoría 1-a-1 row activa, plus future products. `kind` enum permite mentoría/curso/meditación |
| `subscribers` | Identidad del usuario. `role` enum (`subscriber` \| `admin`). `stripeCustomerId` set en primer webhook |
| `subscriptions` | 1:1 con Stripe Subscription. `status` enum (`active` \| `past_due` \| `canceled`), `cancelAtPeriodEnd` bool, `sessionsRemaining` int |
| `auth_tokens` | Magic links SHA-256 hashed. `kind` (`welcome` \| `login`), TTL split |
| `sessions` | Cookie `pe_session`, HTTPOnly, 30-day TTL |
| `stripe_events` | Idempotency log para webhooks. Commit-at-end del handler |
| `audit_log` | Acciones admin (cancel, set_sessions_remaining, resend_welcome, cancel_subscription_db_write_failed). FK a `subscribers.id` (admin + target) |
| `rate_limit_attempts` | Per-IP attempts para login. Index sobre (endpoint, ip, attempted_at desc) |
| `waitlist` | LFPDPPP append-only. No UNIQUE constraint en (email, product) |

Estado actual de datos:

- **3 subscribers**: JP admin + 2 historical canceled (smoke residue).
- **2 subscriptions**: ambas `status=canceled` (smoke residue).
- **1 product**: `mentoria-1a1` activo, $2222 MXN, capacity 8, current
  active count = 0.

---

## Routes activas en producción

### Públicas (no auth)

| Route | Tipo | Notas |
|---|---|---|
| `/` | page | Home — StarField + Hero + 4 servicios + AboutMe + Footer |
| `/mentoria` | page | Phase 6 landing + read-only capacity counter |
| `/gracias` | page | Post-checkout redirect target |
| `/privacidad` | page | LFPDPPP — required por ley para formularios con PII |
| `/login` | page | Magic-link login form |

### Auth (cookie `pe_session`)

| Route | Tipo | Notas |
|---|---|---|
| `/cuenta` | page | Panel del suscriptor — status, próximo cobro, sessions, manage billing |
| `/cuenta/perfil` | page | Onboarding form post-welcome para completar perfil |

### Admin (cookie `pe_session` + `role='admin'`)

| Route | Tipo | Notas |
|---|---|---|
| `/admin` | page | Lista de subs (activos + canceled tabs). Amber pill cuando `cancelAtPeriodEnd=true` |
| `/admin/[id]` | page | Detalle por subscriber. UUID-guarded (rejects `.env`-style probes) |

### API routes

| Route | Method | Notas |
|---|---|---|
| `/api/health` | GET | DB connectivity smoke (`SELECT 1`) |
| `/api/auth/login` | POST | Request magic link (no PII leak — same response existent/non-existent) |
| `/api/auth/verify` | GET | Magic link verify, single-use enforced |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/checkout/create` | POST | Stripe Checkout Session (capacity-gated) |
| `/api/webhooks/stripe` | POST | 6 Stripe events, idempotent via `stripe_events` table |
| `/api/billing-portal/create` | POST | Stripe Customer Portal redirect |
| `/api/admin/sessions-remaining` | PATCH | Edit sub's sessions counter + audit_log |
| `/api/admin/resend-welcome` | POST | Re-send welcome email + audit_log |
| `/api/admin/cancel-subscription` | POST | Cancel via Stripe + optimistic DB write + fail-closed (500 + audit on DB failure) |

---

## Middleware

Single `src/middleware.ts` handles:
1. Session cookie validation for `/cuenta/*` and `/admin/*` paths.
2. Admin role enforcement for `/admin/*` (redirects subscribers to `/cuenta`).
3. Auth verify route is a query-param GET, NOT a `[token]` segment.

---

## Auth flow

- **Subscriber identity = "pagó por Stripe"**. No `/registro` UI. The
  `subscribers` row is created webhook-driven on `checkout.session.completed`.
- **Magic link via email** — Resend, kind discriminator (`welcome` 7d /
  `login` 15min), single-use, SHA-256 hashed.
- **Session cookie** `pe_session`, HTTPOnly, 30-day TTL, set by
  `/api/auth/verify`.
- **Admin auth** via `subscribers.role = 'admin'` (`subscriber_role` pgEnum),
  NOT a separate table. `requireAdmin()` helper en `src/lib/auth.ts:61`.

---

## Hooks de seguridad activos (`.claude/hooks/`)

5 scripts bash gateando Claude Code tool calls (no afectan al sistema en
producción — son guardrails de desarrollo):

| Hook | Bloquea |
|---|---|
| `block-main-writes.sh` | git write ops en `main`/`master` |
| `block-env-writes.sh` | writes a `.env*` |
| `block-rm-rf-absolute.sh` | `rm -rf` con path absoluto fuera del repo |
| `block-force-push.sh` | `git push --force`/`--force-with-lease` |
| `block-source-data-deletes.sh` | clears de archivos visuales/config críticos |

---

## Git state baseline

| Item | Valor |
|---|---|
| Production branch | `main` (auto-deploy a Vercel) |
| Tag de launch | `phase-6-launched` (commit a partir de PR #1 merge) |
| Último merge significativo | `Merge hotfix: admin UX + security fixes from LIVE smoke` |
| Convención de branches | `feature/*`, `fix/*`, `hotfix/*`, `chore/*`, `docs/*` |
| Merges | `--no-ff` cuando es feature; FF acceptable cuando es chore/docs sequential |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) |

---

## Pendientes operacionales conocidos (no bloqueantes para LIVE)

- **Google Safe Browsing review** submitted 2026-05-26 (24-72h SLA).
  Chrome desktop puede mostrar warning hasta que apruebe. Mobile +
  incognito no afectados.
- **DATABASE_URL_TEST split** pendiente (HIGH/data-integrity en backlog).
  Dos incidentes recoverable durante hotfix cycle por correr vitest contra
  prod-pointing `.env.local`. Standing rule añadida a `CLAUDE.md`.
- **Vercel Preview env vars** sin mirrored values — preview deploys
  fallan en prebuild. Workaround: smoke directo contra main post-merge.

Detalle priorizado en `docs/PHASE_6_5_BACKLOG.md`.

---

## Para nuevos chats / nuevos contributors

- **Snapshot operacional:** este doc.
- **Workflow del desarrollo:** `docs/AI_DEVELOPMENT_WORKFLOW.md`.
- **Setup local + recovery cuando algo se rompe:** `docs/AI_SETUP_AND_WORKFLOW.md`.
- **Próximo trabajo:** `docs/PHASE_6_5_BACKLOG.md`.
- **Historia archivada:** `docs/archive/`.
