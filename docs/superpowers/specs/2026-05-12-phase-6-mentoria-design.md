# Phase 6 — Mentoría 1-a-1: Design Spec

**Status:** draft v2, pending user review (incorporates 16 review issues from review B5)
**Date:** 2026-05-12
**Authors:** brainstorming session (Claude Opus + Michael)
**Predecessor docs:** `docs/ARCHITECTURE_AND_ROADMAP.md`, `docs/PROJECT_CONTEXT.md`
**Next step:** writing-plans (implementation plan), after ROADMAP reconciliation (see §17)

---

## 1. Scope

Phase 6 delivers a recurring-subscription product ("Mentoría 1-a-1") to the existing Portal Espiritual landing page. Capacity is 8 active subscribers max. Price is $2222 MXN/month via Stripe Subscriptions. Authentication is magic-link email. Persistence is Neon Postgres via Drizzle.

This spec closes every open decision (D1–D21) from the roadmap and adds the operational decisions surfaced in brainstorming (past_due handling, session reset semantics, security criteria for magic link, Stripe Customer Portal integration).

### In scope

- Public `/mentoria` page with capacity-aware CTA
- Stripe Hosted Checkout flow with atomic capacity enforcement at webhook time
- Custom magic-link authentication (no NextAuth)
- Subscriber dashboard (`/cuenta`) — complete: first-visit profile form, edit fields, sessions counter, status, Stripe Customer Portal integration
- Minimal admin panel (`/admin`) — read-only detail page + inline sessions adjustment + cancel-at-period-end button
- Waitlist (manual, no auto-promote, LFPDPPP-compliant consent form)
- Webhook handler for Stripe events (idempotent)
- `/privacidad` page (LFPDPPP aviso)
- 5th service card on home page in dedicated section below current grid
- Audit log for admin actions

### Out of scope (Phase 6.5+)

- Admin: edit subscriber personal fields (email/name/IG/phone/etc) — done via SQL in Phase 6
- Admin: rich notes editor, search, sort, export, custom filters
- Pause subscription (Stripe `pause_collection`)
- Subscriber-initiated email change
- Cal.com integration for session scheduling (sessions scheduled out-of-band; we only count)
- Cursos / meditaciones / comunidad (Phase 7+)
- Multi-admin
- Trials, coupons, discounts, plan changes
- CFDI / fiscal invoicing

---

## 2. Architectural principles (binding)

These come from `ARCHITECTURE_AND_ROADMAP.md §2`. Any implementation decision that conflicts with them gets rejected or justified explicitly.

1. **Configuration over code** — content the client may edit lives in typed config files.
2. **Single source of truth** — one authoritative definition per concept.
3. **Schema genérico, lógica específica** — `products.kind` + `metadata jsonb` keep DB future-friendly.
4. **Webhooks idempotentes** — every Stripe event is processed once even if delivered N times.
5. **Server components for server-side data; client only where interactivity needed.**
6. **Mobile-first** — primary breakpoint 375px (Instagram in-app browser).
7. **No reescribir Phase 6 para soportar Phase 7+** — schema must extend, not migrate.

---

## 3. Data model

Nine tables. Phase-6-only; designed so Phase 7+ adds rows (and possibly columns), not table rewrites.

### 3.1 `products`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `kind` | enum (`'subscription' | 'one_off'`) | Phase 6: only `'subscription'`. Phase 7 will add `'one_off'`. |
| `slug` | text unique | e.g. `'mentoria-1a1'` |
| `name` | text | display name |
| `price_mxn` | int | integer pesos (e.g. `2222`); never fractional |
| `currency` | text | `'MXN'` |
| `capacity` | int nullable | `8` for mentoría. Null = unlimited. |
| `stripe_price_id` | text | matches Stripe |
| `stripe_product_id` | text | matches Stripe |
| `metadata` | jsonb | extensibility |
| `created_at` | timestamptz | |

Seeded with one row for mentoría at migration time.

### 3.2 `subscribers`

The user table. Named `subscribers` because the domain is subscription, but functions as users for auth purposes.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `email` | citext unique | identity; case-insensitive |
| `role` | enum (`'subscriber' | 'admin'`) | default `'subscriber'` |
| `stripe_customer_id` | text nullable | set on first checkout |
| `name` | text nullable | filled in first-visit form |
| `instagram_handle` | text nullable | required by first-visit form |
| `date_of_birth` | date nullable | required by first-visit form |
| `phone` | text nullable | optional |
| `timezone` | text default `'America/Mexico_City'` | optional |
| `notes_from_subscriber` | text nullable | "contexto para JP" |
| `profile_completed_at` | timestamptz nullable | set when first-visit form submitted |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Re-join semantics (D11):** if `email` already exists, reuse the row. Historical subscriptions remain associated; `created_at` does not change.

**Email mutability (D15):** subscribers cannot edit `email` via UI. Admin endpoint exists but invalidates all sessions for that subscriber on change. In Phase 6 the change is done via SQL.

### 3.3 `subscriptions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `subscriber_id` | uuid fk → subscribers | |
| `product_id` | uuid fk → products | |
| `status` | enum (`'active' | 'past_due' | 'canceled'`) | mirrors Stripe |
| `stripe_subscription_id` | text unique | |
| `current_period_start` | timestamptz | from Stripe |
| `current_period_end` | timestamptz | from Stripe |
| `cancel_at_period_end` | bool default false | |
| `canceled_at` | timestamptz nullable | when Stripe reports canceled |
| `sessions_remaining` | int | reset to 2 on each `invoice.paid` |
| `welcome_email_status` | enum (`'pending' | 'sent' | 'failed' | 'bounced'`) default `'pending'` | tracks deliverability of the initial magic-link email (§13.3) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Partial unique index for capacity enforcement:
```sql
CREATE UNIQUE INDEX subscriptions_active_subscriber_per_product
  ON subscriptions (subscriber_id, product_id)
  WHERE status IN ('active', 'past_due');
```
This prevents a single subscriber from holding two simultaneous active+past_due subs for the same product.

Capacity (8 spots) is enforced at write time by a conditional INSERT — see §5.

### 3.4 `waitlist`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `email` | text | not unique (same email can re-add over time) |
| `product_id` | uuid fk → products | |
| `consent_privacy_at` | timestamptz | explicit LFPDPPP consent timestamp |
| `consent_privacy_version` | text | the version string of `/privacidad` they accepted — see format below |
| `notified_at` | timestamptz nullable | when admin marked them notified |
| `created_at` | timestamptz | |

**`consent_privacy_version` format:** ISO date string `YYYY-MM-DD` matching the `PRIVACY_VERSION` constant exported from `src/app/privacidad/page.tsx`. The maintainer updates this constant manually whenever the privacy text changes. This gives us a stable, human-readable, lawyer-friendly version identifier. (Git SHAs would be more rigorous but are opaque to a non-developer who needs to identify a version in a legal context.)

### 3.5 `stripe_events`

Idempotency log. Required by principle 4.

| Column | Type | Notes |
|---|---|---|
| `stripe_event_id` | text pk | from Stripe payload |
| `type` | text | e.g. `'checkout.session.completed'` |
| `payload` | jsonb | full event for debugging |
| `processed_at` | timestamptz | |

The row is inserted **at the end** of webhook processing (the commit point), not at the start. See §13.2 for the rationale (replay-safe handling of multi-side-effect webhooks). The check-then-skip on retry is done via a SELECT, not via INSERT … ON CONFLICT.

### 3.6 `auth_tokens`

Magic-link single-use tokens.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `token_hash` | text unique | SHA-256 hex of the raw token |
| `subscriber_id` | uuid fk → subscribers | |
| `kind` | enum (`'welcome' | 'login'`) | determines expiry policy and email template |
| `expires_at` | timestamptz | `welcome` → created_at + 7 days; `login` → created_at + 15 min |
| `consumed_at` | timestamptz nullable | single-use flag |
| `created_at` | timestamptz | |

### 3.7 `sessions`

Server-side session storage (revocable; not JWT).

| Column | Type | Notes |
|---|---|---|
| `id` | text pk | opaque cookie value (random 32 bytes hex) |
| `subscriber_id` | uuid fk → subscribers | |
| `expires_at` | timestamptz | now + 30 days, sliding |
| `created_at` | timestamptz | |
| `last_seen_at` | timestamptz | bumped on access; triggers sliding renewal |

### 3.8 `audit_log`

Admin actions only.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `admin_id` | uuid fk → subscribers | the admin who did the action |
| `action` | text | e.g. `'set_sessions_remaining'`, `'cancel_subscription'`, `'change_subscriber_email'`, `'duplicate_subscription_refund'`, `'capacity_race_refund'` |
| `target_subscriber_id` | uuid fk → subscribers nullable | who was affected |
| `before` | jsonb nullable | snapshot of changed fields |
| `after` | jsonb nullable | new values |
| `created_at` | timestamptz | |

System-initiated rows (race-refund, duplicate-refund) have `admin_id = NULL`.

### 3.9 `rate_limit_attempts`

Per-IP rate limit counter for `POST /api/auth/login` (and any future rate-limited endpoint). See §7.2 criterion 4.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `endpoint` | text | e.g. `'auth_login'` |
| `ip` | inet | client IP (from `x-forwarded-for` first hop, with Vercel's proxy chain) |
| `attempted_at` | timestamptz | |

Index: `(endpoint, ip, attempted_at desc)` to support `WHERE endpoint=$1 AND ip=$2 AND attempted_at > now() - interval '60 seconds'` efficiently.

Periodic cleanup: rows older than 1 hour are deleted by a low-frequency cron (e.g. daily Vercel cron job calling `DELETE FROM rate_limit_attempts WHERE attempted_at < now() - interval '1 hour'`). Not critical for correctness — only for keeping the table small.

---

## 4. UI placement (home + mentoría page)

### 4.1 Home page (`/`)

Adds one new section below the existing grid + below the "Reservar tu sesión" CTA button. New section is **its own visual block**, not a 5th element shoehorned into the 2x2 grid.

Layout:
```
[ existing hero + 4-card grid + "Reservar tu sesión" CTA ]
[ visual separator (whitespace + maybe star decoration) ]
[ Mentoría card — centered, single column, full visual width of section ]
[ AboutMe + Footer (existing) ]
```

The mentoría card uses the same visual primitives as `ServiceCard` (CelestialBorder, font hierarchy, paleta) but renders in its own component since the data structure and CTA flow differ.

### 4.2 Mentoría card content (literal copy, do not modify)

- Title: `Mentoría 1-a-1`
- Price: `$2222 MXN / mes` (the `/ mes` must be present and legible; no special highlight)
- Description: `Te acompaño en tu proceso de Ascensión. Qué incluye? 2 sesiones privadas al mes de 30 min, acceso a mensajes directos por Insta y un plan personalizado de desarrollo consciente alineado a tu visión. Encarna tu Ser Superior.`
- CTA when capacity available: `Suscríbete` → starts Stripe Checkout
- CTA when capacity full: `Cupo lleno - únete a la lista de espera` → opens waitlist form modal

### 4.3 `/mentoria` standalone page

Server component that renders the same `MentoriaCard` (single component; same `capacityFull` prop wiring) plus a longer description / benefits section around it. Same CTA logic. Linked from header / footer / home card if needed.

### 4.4 `/privacidad`

Static page with LFPDPPP-compliant privacy notice. Linked from:
- Waitlist form (with consent checkbox)
- Checkout disclaimer ("Al suscribirte aceptas …")
- Subscriber first-visit form
- Site footer

Content drafted by JP / lawyer reference. Versioned (filename or git history) so `waitlist.consent_privacy_version` can pin the exact text the user accepted.

---

## 5. Capacity enforcement & race conditions

**No pre-checkout locks.** Anyone can start Stripe Checkout regardless of current count. Capacity is enforced at webhook time.

### 5.1 Atomic capacity check (D2, D8)

Inside the webhook handler for `checkout.session.completed`, wrap in a single transaction:

```sql
INSERT INTO subscriptions (
  subscriber_id, product_id, status, stripe_subscription_id,
  current_period_start, current_period_end, sessions_remaining
)
SELECT $1, $2, 'active', $3, $4, $5, 2
WHERE (
  SELECT COUNT(*) FROM subscriptions
  WHERE product_id = $2 AND status IN ('active', 'past_due')
) < (SELECT capacity FROM products WHERE id = $2)
RETURNING id;
```

If `RETURNING` is empty (cap already filled by a concurrent webhook):

1. Call `stripe.subscriptions.cancel(sub_id, { prorate: false, invoice_now: false })`.
2. Call `stripe.refunds.create({ payment_intent: <pi_id> })` for the charge associated with this checkout.
3. Send Resend email to the user: subject "Tu suscripción a Mentoría no pudo completarse", body explains race, confirms refund, offers `/waitlist?email=...` link.
4. Insert audit log row `action = 'capacity_race_refund'` (admin_id null since system-initiated).
5. Webhook returns 200 (idempotency).

The decision to keep `past_due` rows in the active-count is deliberate: a past_due subscriber still occupies a spot during Stripe's retry window. If they fully fail, Stripe sends `customer.subscription.deleted` → status flips to `canceled` → spot frees.

### 5.2 Why partial-index alone is insufficient

The partial unique index in §3.3 prevents one *subscriber* from double-subscribing, but not 8 *different* subscribers from each entering the 9th slot. The conditional INSERT is the actual capacity guard. The index is belt-and-suspenders.

### 5.3 Capacity display on `/mentoria`

The card reads `COUNT(*) WHERE status IN ('active', 'past_due')` server-side at render time. Decision to show "X de 8 ocupados" or just toggle the button copy is left to writing-plans (recommend just toggling button copy — exact count is anxiety-inducing). Re-render frequency: server-component fetches on every request; no caching for this query.

---

## 6. Checkout flow (D5, D6, D7)

**D5:** Stripe Hosted Checkout (`mode: 'subscription'`). PCI scope is SAQ A. Supports MXN, autopay, 3D Secure mexicano out of the box.

### 6.1 Happy path

1. User clicks `Suscríbete` on `/mentoria` or home card → `POST /api/checkout/create`.
2. Server creates Stripe Checkout session with `success_url = https://.../gracias`, `cancel_url = https://.../mentoria?checkout=canceled`. Stores nothing in DB yet.
3. Redirect to Stripe-hosted URL.
4. User pays. Stripe redirects to `/gracias`.
5. `/gracias` shows: "Pago recibido. En segundos te llega un correo con tu acceso." No polling, no DB lookup.
6. Stripe sends `checkout.session.completed` → our webhook → atomic capacity insert + create/find subscriber by email + insert auth_token + send Resend email with magic link.
7. User opens email, clicks magic link → `/api/auth/verify` → session cookie set → redirect:
   - If `name IS NULL OR instagram_handle IS NULL OR date_of_birth IS NULL` → `/cuenta/perfil` (first-visit form, per §7.4 / §8.1)
   - Else → `/cuenta`

### 6.1.1 Existing active subscriber double-payment guard (A2)

Two layers of protection prevent an already-subscribed user from accidentally double-paying:

**Layer 1 — `POST /api/checkout/create` pre-check (logged-in users):**
If the request comes from a logged-in subscriber whose `subscribers.id` already has a `subscriptions` row in (`active`, `past_due`), reject with 409 and a body indicating the existing subscription. The CTA on `/mentoria` for logged-in users with an active sub renders as "Ver mi suscripción" → `/cuenta` instead of "Suscríbete".

**Layer 2 — webhook fallback (anonymous checkouts):**
Anonymous users (no session) can still hit the `Suscríbete` button — there's no email known until Stripe collects it during checkout. They get past the pre-check. If, post-payment, the webhook attempts to INSERT a subscription and the partial unique index from §3.3 raises a constraint violation (`subscriptions_active_subscriber_per_product`), the webhook treats this as the "already active" case:

1. Call `stripe.subscriptions.cancel(sub_id, ...)` with idempotency key `<event_id>:cancel`.
2. Call `stripe.refunds.create({ payment_intent, ... })` with idempotency key `<event_id>:refund`.
3. Send "duplicate subscription" email (distinct copy from the race email): "Detectamos que ya tienes una suscripción activa. Te reembolsamos los $2222 MXN. Para administrar tu suscripción ve a /cuenta."
4. Log to `stripe_events` and `audit_log` (`action='duplicate_subscription_refund'`).

The "race condition" email (§5.1) and the "duplicate subscription" email are **distinct templates** — different copy, different cause, different next-step CTA. Both are sent automatically by the webhook.

### 6.2 Cancel mid-checkout (D6)

User closes Stripe page or clicks back. Stripe redirects to `cancel_url`. Page shows: "Tu suscripción quedó pendiente. Dale otra vez al botón cuando estés listo." No emails. No DB rows.

### 6.3 Webhook latency (D7) — honest cost statement

The success page (`/gracias`) does not depend on the webhook having fired. The email (generated *by* the webhook) is the activation signal. Typical Stripe webhook delivery is <5s.

**Honest framing of the cost:** if the webhook is delayed >30 seconds (rare, but happens — Stripe outages, our serverless cold-start, Resend queue lag, Vercel function timeout), the user has paid, received the success page, but no welcome email. From their perspective: they paid and nothing happened. Their natural recourse is to message Juan Pablo via Instagram DM.

This is a point of friction. It is acceptable for Phase 6 because: (a) the user base is small (≤8) and JP has direct Instagram contact with everyone, (b) the cost of building robust client-side polling + DB lookup + race-free "still processing" UI is high for an event that will affect at most a handful of users in Phase 6 lifetime. The fallback in §6.4 catches the case where the user finds their way to `/cuenta` somehow before the email arrives.

**Fallback if user clicks magic link before webhook processes:** very rare since magic link is generated *by* the webhook. If a separate manual login is attempted before the webhook lands, the subscriber row doesn't exist yet and login responds with a generic 200 + no email (per §7.6 email-enumeration protection); user will then check email a moment later when the real webhook-issued link arrives.

### 6.4 Fallback on `/cuenta` if subscription row missing

When a logged-in subscriber visits `/cuenta` but no `subscriptions` row exists (extreme edge: webhook delayed >30s and they bypassed the email link somehow), show: "Tu suscripción se está procesando. Refresca en unos segundos." with a manual refresh button. No automatic polling.

### 6.5 Past_due handling (Stripe Smart Retries, default policy)

When Stripe sends `invoice.payment_failed`:

- `subscriptions.status = 'past_due'`
- Subscriber **retains access** (sessions counter, `/cuenta`)
- Red banner on `/cuenta`: "Tu pago falló. Actualiza tu tarjeta [Abrir Stripe Customer Portal]"
- Stripe Smart Retries handles automatic retry attempts on an ML-optimized schedule

**Smart Retries actual behavior** (per Stripe Billing → Revenue recovery → Retries config, May 2026):

- Stripe's recommended/default policy: up to 8 retry attempts over a 2-week window, with timing chosen per-card by Stripe's ML model (no fixed schedule — it learns from card-issuer behavior to pick "best" retry moments).
- After all retries are exhausted, the configured failure action fires. We use the default: subscription is canceled and `customer.subscription.deleted` is sent.
- Configured in Stripe Dashboard → **Billing → Revenue recovery → Retries**.

**Justification for using defaults rather than customizing:**
1. We have no data to outperform Stripe's ML-driven schedule.
2. 8 attempts / 2 weeks is short enough that a non-responsive subscriber's spot frees within a reasonable timeframe (matters for our 8-spot cap).
3. Custom retry schedules add ops burden (JP would have to reason about retry policy) for no measurable revenue lift at this user count.

When retry succeeds (`invoice.paid`): status flips back to `'active'`, banner disappears, sessions counter resets to 2 if it's a new billing cycle.

When all retries exhausted: Stripe sends `customer.subscription.deleted` → status `'canceled'` → spot is freed (next checkout webhook will see capacity < 8 and succeed).

**Important spot-occupancy note (A3):** during the up-to-2-week retry window, a `past_due` subscriber **continues to occupy a spot** (per §5.1, the capacity count includes both `'active'` and `'past_due'`). If JP needs to free a spot before retries exhaust — for example, to take a waitlisted person off the queue when one current subscriber has clearly abandoned — his only recourse is to cancel the subscription manually from the admin panel (`POST /api/admin/cancel-subscription`). This is intentional: automated early-cancellation on payment failure would lose revenue recovery from the Smart Retries window.

---

## 7. Authentication — custom magic link

**No NextAuth.** Custom implementation. Eight security criteria are acceptance tests for writing-plans.

### 7.1 Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/login` | Body: `{ email }`. Looks up subscriber. If found, generate token, store hash, send Resend email. Always returns 200. |
| `GET /api/auth/verify?token=...` | Look up by hash. If valid + unconsumed + unexpired: mark consumed, create `sessions` row, set cookie, redirect (`/cuenta/perfil` if profile incomplete, `/cuenta` else; `/admin` if role=admin). |
| `POST /api/auth/logout` | Delete `sessions` row by cookie value. Clear cookie. |

The webhook also creates auth_token rows automatically — the welcome email *is* the first magic link.

### 7.2 Security acceptance criteria (testable)

These become test cases:

1. **Tokens hashed (SHA-256 hex) before storage.** Plaintext token only exists in the email link.
2. **Expiry depends on token `kind`:**
   - `kind='login'` (user-initiated `POST /api/auth/login`): **15 minutes** from creation. Short window because the user is actively waiting for the email.
   - `kind='welcome'` (issued by the webhook after `checkout.session.completed`): **7 days** from creation. The longer window prevents the realistic case where a user pays at 11pm and only checks email the next morning, or pays from mobile and checks from desktop later.
   Verify endpoint rejects expired tokens of either kind. If a welcome link expires (>7d), the user can request a fresh login link via `POST /api/auth/login` once their subscriber row exists.
3. **Single-use.** `consumed_at` set on successful verify; reuse returns 401.
4. **Rate limit `POST /api/auth/login`** to 5 requests/min per source IP. Returns 429 on exceed.

   **Decision (D3):** DB-backed implementation using a `rate_limit_attempts` table — see §3.9 below. Reason: zero new infra, works across Vercel multi-instance serverless (the DB is the shared source of truth), trivially fits Phase 6 traffic levels (≤8 subscribers, very low /api/auth/login volume). Upstash/Redis is over-engineering at this scale; revisit only if traffic grows.

   Implementation sketch: on each `POST /api/auth/login`, INSERT a row keyed by `(endpoint='auth_login', ip)`. Before responding, count rows for the same `(endpoint, ip)` in the last 60 seconds; if ≥5, return 429. Periodic cleanup of rows older than 1 hour is handled by a daily Vercel cron or simply allowed to accumulate (small data; Postgres VACUUM reclaims).
5. **Constant-time comparison** when matching token hashes (`crypto.timingSafeEqual` on equal-length buffers).
6. **Cookies HttpOnly + Secure + SameSite=Lax.** Cookie name e.g. `pe_session`. Path `/`. Max-age 30 days.
7. **No email-existence leak.** `POST /api/auth/login` always returns 200 (or generic 429 on rate limit), regardless of whether the email exists. Email is sent only if it does.
8. **Logout deletes the session row**, not just the cookie. (Prevents replay if cookie was captured.)

### 7.3 Session model (D9)

30-day sliding window. On each request that hits a protected route, `last_seen_at` updates and `expires_at` extends to `last_seen_at + 30 days`. Logout deletes the row.

### 7.4 Role-based redirect (D10)

Single login flow. Redirect destination is determined at verify time in this order:
- `role = 'admin'` → `/admin` (admins skip the profile form entirely)
- `role = 'subscriber'` and required-fields incomplete → `/cuenta/perfil`
- `role = 'subscriber'` and required fields populated → `/cuenta`

"Required-fields incomplete" is evaluated by checking the actual columns:
`name IS NULL OR instagram_handle IS NULL OR date_of_birth IS NULL`.

The `profile_completed_at` column remains as an audit timestamp (set when the user first submits the profile form), but is **not** used as the gate. Reason: if Phase 6.5 adds a new required field, the field-level check naturally re-prompts users who completed an older version of the form; a single boolean would leave them with stale incomplete data and require a one-off migration to fix.

### 7.5 Admin bootstrapping

Juan Pablo's admin row is created via a one-off seed script (`/scripts/seed-admin.ts`, run locally with the production `DATABASE_URL`) that inserts with `role = 'admin'` and `profile_completed_at = now()` (so he is never prompted to fill the subscriber profile form). The email comes from an env var (e.g. `ADMIN_SEED_EMAIL`). He logs in via the same magic link flow.

### 7.6 Email enumeration protection (criterion #7)

`POST /api/auth/login` returns 200 within ~250ms regardless of whether the email exists (use `setTimeout` if response is too fast, to flatten timing leaks). Email is sent asynchronously only if row exists.

### 7.7 Re-join semantics again

If someone whose subscription was canceled tries to log in 6 months later: their `subscribers` row still exists, magic link works, they see `/cuenta` with status `canceled` and a CTA to re-subscribe via the same `/mentoria` flow.

For re-subscription, `POST /api/checkout/create` checks if a subscriber row exists for the email; if so and `stripe_customer_id` is set, it passes that customer ID to Stripe Checkout (so the same Stripe customer is reused — cards on file, history preserved). If no `stripe_customer_id` yet, Stripe Checkout creates a new customer and we persist the ID on the webhook. The new `subscriptions` row is inserted on `checkout.session.completed`.

---

## 8. Subscriber dashboard (`/cuenta`)

Complete in Phase 6.

### 8.1 First-visit profile form (`/cuenta/perfil`)

Triggered when any of `subscribers.name`, `subscribers.instagram_handle`, `subscribers.date_of_birth` is `NULL`. Until all three are populated, no other `/cuenta` page renders — middleware redirects. The `profile_completed_at` column is set on first successful submit for audit purposes but is not the gate (see §7.4).

Fields:
- Nombre completo — **required**
- Instagram handle — **required**
- Fecha de nacimiento — **required**
- Teléfono / WhatsApp — optional
- Zona horaria — optional, default `America/Mexico_City`
- Notas/contexto para JP — optional textarea

On submit: validate with Zod, write to `subscribers`, set `profile_completed_at = now()`, redirect to `/cuenta`.

### 8.2 Main dashboard

- **Info personal section** — read fields, click-to-edit for all except `email`. Save via Server Action.
- **Sesiones restantes** — large display "X / 2 sesiones este mes". Read-only for subscriber.
- **Status section** — current status, next billing date, price.
- **Past_due banner** (conditional, status=past_due) — red, with link to Stripe Customer Portal.
- **"Administrar pago / suscripción" button** → server action generates Stripe billing portal session, redirects user. Customer Portal handles: update card, view invoices, cancel subscription.
- **Pre-cancel text** (near the "Administrar pago" button): "Si tienes dudas, escríbele a Juan Pablo a [contacto] antes de cancelar."

### 8.3 Customer Portal configuration

Activated in Stripe Dashboard. Allowed actions:
- Update payment method
- View invoice history
- Cancel subscription (with `cancel_at_period_end = true` enforced via portal config)

Disabled actions:
- Plan change
- Quantity change
- Pause

Return URL from Customer Portal points back to `/cuenta`.

### 8.4 Cancel flow (D16)

`cancel_at_period_end = true`. Subscriber retains access until `current_period_end`. Stripe sends `customer.subscription.updated` with cancel flag → we mirror it. At period end, Stripe sends `customer.subscription.deleted` → status `'canceled'`.

If subscriber cancels and then changes their mind before period end, they can resume via Customer Portal (uncancel). Stripe handles this; we just mirror via webhook.

---

## 9. Admin panel (`/admin`)

Minimal. Out-of-scope items in §1.

### 9.1 List view (`/admin`)

Table:

| Nombre | Email | Fecha inicio | Sesiones restantes | Status |
|---|---|---|---|---|

`status` displays one of: `active`, `past_due`, `cancel_at_period_end` (active but flagged), `canceled`.

Toggle: "Ver activas" / "Ver canceladas".

Click row or "Detalles" button → `/admin/[subscriberId]`.

### 9.2 Detail view (`/admin/[id]`)

Read-only display of every field on `subscribers` and the active `subscriptions` row, plus:

- **Edit `sessions_remaining`:** inline numeric input, no modal, no confirm dialog, no required reason. On change, write to DB and append `audit_log` row with `before` / `after` JSON.
- **Cancel button:** confirm dialog ("¿Cancelar al final del período?"). On confirm, calls Stripe API with `cancel_at_period_end = true` on `subscriptions.update`. Webhook mirrors. Logs to `audit_log`.
- **Link to Stripe Customer in Stripe Dashboard:** static URL `https://dashboard.stripe.com/customers/<stripe_customer_id>`. JP uses this for refunds, disputes, invoice download.

### 9.3 What admin cannot do in Phase 6

- Edit subscriber email / name / IG / phone / DOB / timezone / notes (these are handled via SQL by the developer; user count is ≤8)
- Add internal notes
- Pause subscription
- Search, sort, filter beyond active/canceled toggle
- Export CSV

---

## 10. Waitlist

### 10.1 Form

Modal opened from "Cupo lleno - únete a la lista de espera" button.

Fields:
- Email — required
- Checkbox: "Acepto el [aviso de privacidad](/privacidad)" — **required**, no default check

On submit: validate, insert `waitlist` row with `consent_privacy_at = now()` and `consent_privacy_version = <current /privacidad version string>`. Show success: "Listo. Te aviso cuando se abra un cupo."

LFPDPPP compliance: explicit opt-in checkbox is mandatory. Form blocks submit until checked. The version string lets us prove which privacy text the user agreed to even if `/privacidad` is later updated.

### 10.2 Admin behavior (manual)

When a spot frees (a `customer.subscription.deleted` lowers active count below 8), admin gets a visual indicator on `/admin` (e.g. "1 cupo disponible — N en lista de espera"). No automated email. JP decides who/when to notify, manually marks `notified_at` on the rows he reaches out to (this could be a simple checkbox in `/admin/waitlist`, or done by SQL in Phase 6 — to be decided in writing-plans).

### 10.3 No auto-promote

Waitlist is informational. There is no priority queue and no automatic checkout for waitlisted users. They go through the normal `/mentoria` flow when notified.

---

## 11. Migrations & schema management (D17)

- **ORM:** Drizzle. Schema in `src/db/schema.ts`. Migrations generated via `drizzle-kit generate` and committed to `src/db/migrations/`.
- **Forward-only.** No down-migrations. A bad migration is corrected by writing another migration.
- **No `drizzle-kit push` in production.** Always apply migration SQL.
- **No automatic migrations in Next.js startup** (multi-region serverless race condition).
- **Application path — automated via Vercel build:**
  - `package.json` adds `"db:migrate": "drizzle-kit migrate"` and `"prebuild": "npm run db:migrate"`.
  - Vercel injects `DATABASE_URL` (or `POSTGRES_URL`) per environment automatically (production → prod DB; preview → its Neon preview branch).
  - On every Vercel deployment, migrations run before `next build`. If migrations fail, the deploy fails — this is the intended fail-safe.
  - Local dev: `npm run db:migrate` against a local Neon branch URL.
  - No secret ever leaves Vercel. No human runs migrations manually against production.
- **Neon preview branches:** each PR gets its own ephemeral DB branch (already configured per roadmap §10). Migrations on the preview branch are isolated from production.
- **Rollback:** if a deploy succeeds but introduces a bad migration, write a corrective forward migration in a follow-up PR. If a deploy *fails* in the migration step, production DB is untouched (predeploy failed → no `next build` → no traffic shift). The previous deployment stays live.

**Price unit decision:** `products.price_mxn` stores integer pesos (e.g. `2222`). Stripe natively stores minor units internally; we leave that to Stripe and present pesos in our UI/DB. We never math fractional MXN in this product.

---

## 12. API surface (D18)

### Route handlers (`src/app/api/`)

- `POST /api/checkout/create` — creates Stripe Checkout session, returns redirect URL.
- `POST /api/webhooks/stripe` — handles all Stripe events. Reads raw body, verifies signature, dispatches by `event.type`. Idempotent via `stripe_events` table.
- `POST /api/auth/login`, `GET /api/auth/verify`, `POST /api/auth/logout`
- `POST /api/billing-portal/create` — generates Stripe Customer Portal session for logged-in subscriber.
- `POST /api/admin/cancel-subscription` — calls Stripe with `cancel_at_period_end=true`. Admin-gated.
- `PATCH /api/admin/sessions-remaining` — updates counter, writes audit log. Admin-gated.

### Server Actions

- Waitlist signup form (`/mentoria` waitlist modal)
- First-visit profile form (`/cuenta/perfil`)
- Inline edits to subscriber's own fields (`/cuenta`)

### Server Components (data fetch + render)

- `/mentoria` (capacity-aware render)
- `/cuenta` and subroutes (subscriber data)
- `/admin` and `/admin/[id]` (admin gates)
- `/privacidad` (static)

### Client Components (minimal)

- The Stripe Checkout CTA button (uses `<form action={createCheckout}>` server action triggered from a button to keep this simple — but JS-redirect after server action returns the Stripe URL).
- Waitlist modal (open/close state)
- Inline-editable inputs on `/cuenta` and admin sessions-remaining input
- Past_due banner state (mounts only if status=past_due)

---

## 13. Stripe webhook event handlers

### 13.1 Event handler table

| Event | Action |
|---|---|
| `checkout.session.completed` | Atomic capacity insert. On success: upsert subscriber by email, insert subscription, create auth_token, attempt welcome email send. On capacity-full: cancel sub + refund + race email (§5.1). On existing-active-sub partial-index violation: cancel + refund + duplicate-subscription email (§6.1.1). |
| `customer.subscription.created` | No-op (logged for visibility). The actual subscription row is created in `checkout.session.completed` where we have buyer context. If this handler ever needs to do work (e.g. if we add admin-created subscriptions outside checkout), reconsider. |
| `customer.subscription.updated` | Mirror `status`, `current_period_start/end`, `cancel_at_period_end`. |
| `customer.subscription.deleted` | Set `status='canceled'`, set `canceled_at`. Spot frees. |
| `invoice.paid` | If for an active subscription's renewal: reset `sessions_remaining` to 2. |
| `invoice.payment_failed` | Set `status='past_due'` (Stripe will retry per §6.5). |

Webhook signature verification: use `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`. Reject with 400 on invalid signature.

### 13.2 Idempotency model — replay-safe webhook handler (C2)

The naive "INSERT into stripe_events at start, return 200 if conflict" pattern is **insufficient** when a webhook does multiple side effects (DB write + Stripe API call + Resend email). A partial failure between side effects leaves us in an inconsistent state, and the `stripe_events` row already exists so Stripe retries will short-circuit.

**Correct model:** make each side effect individually idempotent, and insert `stripe_events` **only after all side effects succeed**:

1. Read event, verify signature.
2. **Check** if `stripe_events.stripe_event_id` already exists → if yes, return 200 immediately (idempotency log hit). This is a `SELECT`, not an `INSERT`.
3. Execute all side effects, each using an idempotency key derived from `event.id + side_effect_name`:
   - DB inserts use natural unique keys: `subscriptions.stripe_subscription_id` is unique, `subscribers.email` is unique. Re-runs are safe (use `INSERT … ON CONFLICT DO NOTHING/UPDATE`).
   - Stripe API calls pass `idempotencyKey: '<event.id>:<action>'` (e.g. `'evt_xxx:cancel'`, `'evt_xxx:refund'`). Stripe returns the same response on replay — no double-refund risk.
   - Resend calls use a custom message header `X-Idempotency-Key: '<event.id>:welcome_email'` for our own retry deduplication. (Resend itself does not enforce idempotency, but we use it to skip on our retry path — see §13.3.)
4. If any side effect throws, **do not** insert `stripe_events`. Return 5xx. Stripe will retry with the same `event.id`; the next attempt re-runs the whole handler but, because of the idempotency keys, no operation duplicates.
5. After **all** side effects succeed, INSERT `stripe_events`. This is the commit point.

This ordering means: Stripe will retry until the handler is fully successful. Stuck events (handler error not transient) surface as Stripe alerts in their Dashboard (Stripe retries for 3 days by default; after that the event is marked failed and we need to investigate via Stripe Dashboard → Events).

### 13.3 Resend email failure handling (C1)

The welcome-email send is the most user-visible side effect. Two failure modes:

**Mode A — transient (network blip, Resend rate limit):**
Resend call returns 5xx. The webhook handler raises, returns 5xx to Stripe. Stripe retries the webhook within seconds. On retry, the DB inserts are idempotent (subscriber + subscription already exist), and we attempt the email again. Most transient failures resolve within 1-2 Stripe retries.

**Mode B — persistent (subscriber email bounces, Resend account issue):**
Resend's send call succeeds (queued) but the message bounces afterward, OR Resend returns 4xx (bad request, invalid email). For 4xx: log + still complete the webhook (insert stripe_events) because we want the subscription row to persist. The user-side problem (bad email, bounced) is handled out-of-band:

- Add column `welcome_email_status` to `subscriptions`: enum `('pending' | 'sent' | 'failed' | 'bounced')`. Default `'pending'`.
- After Resend call: set to `'sent'` on 2xx, `'failed'` on 4xx.
- Resend webhook for bounce → set to `'bounced'` (Phase 6 minimal: skip Resend webhooks entirely; rely on JP noticing via "user never logged in" + admin retry button. Phase 6.5 may add Resend bounce webhook.)
- Admin panel `/admin/[id]` displays the `welcome_email_status` and shows a button "Reenviar welcome email" that re-generates a magic link and re-sends. Idempotency is per-click (creates a new auth_token).

**Trade-off accepted:** if the welcome email persistently bounces (typo'd email captured by Stripe Checkout), the subscriber has paid but cannot self-serve login. JP intervenes manually via admin panel (resend email after correcting via SQL, or refund + cancel). For 8-spot Phase 6 this is acceptable. Phase 6.5 should add automated bounce handling.

### 13.4 Stripe API failure during refund (C2)

If during the race-condition handler (§5.1) or the duplicate-subscription handler (§6.1.1) the Stripe `refunds.create` call fails:

- The idempotency key `'<event.id>:refund'` ensures replay never double-refunds (Stripe returns the original refund object).
- The webhook handler raises, returns 5xx to Stripe, which retries.
- The cancel call (`'<event.id>:cancel'`) is also idempotent — replays are no-ops once succeeded.
- If after Stripe's retry window (3 days) the refund is still failing (e.g. payment was already disputed by user, account-level Stripe issue), the event ends up in Stripe Dashboard → Events → Failed. JP gets a Stripe email alert. Manual recovery: JP issues refund manually from Stripe Dashboard.

Add column `refund_status` to `stripe_events` payload-derived view (or a separate `pending_refunds` table — decision deferred to writing-plans). The admin panel should surface any `stripe_events` rows where the handler ultimately failed, so JP can resolve them manually. The exact UI is Phase 6.5 — for Phase 6 the alerting is via Stripe's own dashboard.

---

## 14. Folder structure (additions)

```
src/
├── app/
│   ├── mentoria/page.tsx              # public mentoría page (server)
│   ├── gracias/page.tsx               # post-checkout success
│   ├── privacidad/page.tsx            # LFPDPPP notice
│   ├── cuenta/
│   │   ├── page.tsx                   # subscriber dashboard (server)
│   │   ├── perfil/page.tsx            # first-visit form
│   │   └── layout.tsx                 # auth gate
│   ├── admin/
│   │   ├── page.tsx                   # subscribers list
│   │   ├── [id]/page.tsx              # subscriber detail
│   │   └── layout.tsx                 # admin gate
│   └── api/
│       ├── checkout/create/route.ts
│       ├── webhooks/stripe/route.ts
│       ├── auth/login/route.ts
│       ├── auth/verify/route.ts
│       ├── auth/logout/route.ts
│       ├── billing-portal/create/route.ts
│       ├── admin/cancel-subscription/route.ts
│       └── admin/sessions-remaining/route.ts
├── components/
│   ├── MentoriaCard.tsx               # single component, takes `capacityFull: boolean` prop
│   ├── WaitlistModal.tsx
│   ├── SubscriberDashboard.tsx
│   ├── SessionsCounter.tsx
│   ├── PastDueBanner.tsx
│   ├── ProfileForm.tsx
│   └── admin/
│       ├── SubscribersList.tsx
│       └── SubscriberDetail.tsx
├── config/
│   ├── services.ts                    # existing — untouched
│   └── mentoria.ts                    # new: mentoría display config
├── db/
│   ├── schema.ts                      # Drizzle schema for all 9 tables
│   ├── client.ts                      # singleton Drizzle client
│   └── migrations/                    # generated SQL migrations
└── lib/
    ├── stripe.ts                      # Stripe SDK client + helpers
    ├── email.ts                       # Resend wrappers
    ├── auth.ts                        # getSession / requireAuth / requireAdmin / token helpers
    ├── audit.ts                       # audit_log writer
    └── capacity.ts                    # atomic capacity insert helper

scripts/
└── seed-admin.ts                      # one-off, sets up JP's admin row (lives at repo root, not under src/)
```

---

## 15. Testing strategy (D20, D21)

Vitest + a dedicated Neon DB branch named `test`. No SQLite (we use `jsonb`, partial indexes, citext).

### 15.1 Required integration tests

Tests verify **observable behavior** — what a hypothetical operator querying the DB and reading delivered emails would see — not implementation details. Re-implementations of internals should not break these tests.

1. **Webhook happy path:**
   Given: empty DB. Fire `checkout.session.completed` event.
   Assert: a `subscribers` row exists for the buyer's email. A `subscriptions` row exists with `status='active'`, `sessions_remaining=2`, and `welcome_email_status='sent'`. An `auth_tokens` row exists for that subscriber. A welcome email was delivered to the buyer's email (verify via test Resend mailbox or mock).

2. **Capacity race (full cap):**
   Given: DB seeded with 8 rows in `subscriptions` with `status='active'`. Fire a 9th `checkout.session.completed` event for a new email.
   Assert: DB still has exactly 8 `active` subscription rows (no new row for the 9th user). The 9th user does **not** have an `auth_tokens` row. A race-condition email was delivered to the 9th user's email address (verify content offers waitlist link). The new user's `subscribers` row may or may not exist (acceptable either way — both compliant) but if it exists, no `subscriptions` row attaches to it.

3. **Capacity with mixed statuses (B2):**
   Given: DB seeded with 5 active + 3 canceled subscriptions for the product. Fire a new `checkout.session.completed` event.
   Assert: DB has 6 `active` subscription rows. The new user has a welcome email. Canceled rows do not block the new subscription. This protects against a regression where `COUNT(*) WHERE status IN ('active','past_due')` accidentally becomes `COUNT(*)` without the filter.

4. **Webhook idempotency (replay):**
   Given: clean DB. Fire `checkout.session.completed` twice with the same `event.id`.
   Assert: DB has exactly 1 subscription row, 1 subscriber row, 1 auth_token row, exactly 1 welcome email delivered.

5. **Magic-link verify is single-use:**
   Given: a valid unconsumed token in `auth_tokens`.
   Step 1: `GET /api/auth/verify?token=...` → assert response sets a session cookie and redirects appropriately.
   Step 2: same `GET /api/auth/verify?token=...` again → assert response is 401 (or redirect to login error page), no new session cookie issued.

6. **Cancel flow (admin):**
   Given: an active subscription. Admin calls `POST /api/admin/cancel-subscription`. Then fire the resulting `customer.subscription.updated` webhook event.
   Assert: after the webhook is processed, the `subscriptions` row has `cancel_at_period_end=true` and `status='active'`. (We test the *outcome* — what the DB ends up showing — not which method on the Stripe SDK was called.)

7. **Past_due → restore:**
   Given: an active subscription. Fire `invoice.payment_failed`. Then fire `invoice.paid` (simulating retry success).
   Assert: after `payment_failed`, the subscription row's `status='past_due'`. After `invoice.paid`, the row's `status='active'` and `sessions_remaining=2`.

8. **Existing-active-sub double-payment guard (A2):**
   Given: a user with an active subscription. Fire a second `checkout.session.completed` for the same email (simulating anonymous double-checkout).
   Assert: DB still has exactly 1 subscription row for that subscriber. A "duplicate subscription" email was delivered (content distinct from race-condition email).

9. **Magic-link security criteria** (one test per criterion in §7.2, observable form):
   - **Plaintext token never in DB:** create token via login flow, query the entire DB for the plaintext token string → assert no match.
   - **Expired token rejected:** create token, fast-forward clock past expiry, call verify → assert 401, no session cookie.
   - **Already-consumed token rejected:** see test 5.
   - **Login returns 200 for both existent and non-existent emails:** call `POST /api/auth/login` with a known email and an unknown email → assert both return 200 with response time within similar bound. For non-existent: assert no Resend delivery. For existent: assert exactly 1 Resend delivery.
   - **Cookie attributes correct:** complete login flow, inspect the response `Set-Cookie` header → assert `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age` ≥ 30 days × 86400.
   - **Logout deletes the session row:** create session, call logout, query `sessions` table → assert the row is gone. Then replay the old cookie to a protected route → assert 401.

10. **Rate limit — per-IP exceed (B3):**
    Given: clean state. Issue 6 sequential `POST /api/auth/login` requests from the same source IP within 1 minute.
    Assert: requests 1–5 return 200, request 6 returns 429.

11. **Rate limit — per-IP isolation (B3):**
    Given: clean state. Issue 5 requests from `IP_A` and 5 requests from `IP_B`, interleaved within 1 minute.
    Assert: all 10 return 200. (Guards against the regression where a global counter conflates per-IP buckets.)

### 15.2 Not tested (intentional, scaled to risk)

- Visual regression of marketing pages (visual review remains the method)
- Per-component React unit tests
- E2E browser tests via Puppeteer/Playwright (deferred to manual pre-launch checklist before live-mode rollout)
- Admin CRUD permutations beyond sessions_remaining + cancel

### 15.3 Pre-launch manual checklist (before Phase 6 declared done)

Per `ARCHITECTURE_AND_ROADMAP.md §5`:

- $1 MXN test charge in Stripe live mode end-to-end (subscribe → webhook → email → magic link → /cuenta → cancel → refund)
- JP informed of SAT fiscal decision before live charge
- LFPDPPP `/privacidad` reviewed by JP (and ideally a lawyer)
- Resend domain verification still active
- Stripe Customer Portal configured per §8.3
- **All transactional emails visually rendered with real data and reviewed on mobile (Instagram in-app browser):** welcome email (magic link), race-condition email (refund + waitlist offer), duplicate-subscription email (refund + ya-tienes message), past_due banner-triggered email if any, sessions-reset notification if added. Verify: no `{{var}}` placeholders remain unrendered, all links resolve to real URLs, sender domain matches `portalespiritual.com.mx`, copy reads correctly in Spanish.

---

## 16. Closed decisions summary (D1–D21)

| # | Decision | Closed value |
|---|---|---|
| D1 | Schema scope | Phase-6-only tables, generic via `kind` + jsonb metadata |
| D2 | 8-spot modeling | Conditional INSERT at webhook time, no pre-checkout locks |
| D3 | Sessions remaining | Integer counter; reset to 2 on every `invoice.paid` |
| D4 | Roles | Simple enum `subscriber` / `admin` |
| D5 | Checkout type | Stripe Hosted Checkout |
| D6 | User cancels checkout | Friendly message, no DB rows, no email |
| D7 | Webhook latency | Email is the activation signal; no polling |
| D8 | Spot race at webhook | Atomic INSERT; auto-cancel + refund + race email |
| D9 | Session duration | 30 days sliding |
| D10 | Auth endpoints | Single flow, redirect by role |
| D11 | Re-subscriber | Same email = same `subscribers.id` |
| D12 | Audit | `audit_log` table for all admin actions |
| D13 | Notify on subscriber edit | No (admin doesn't edit personal fields in Phase 6) |
| D14 | "Mark inactive" manually | Out of scope; admin only cancels via Stripe (which webhook mirrors) |
| D15 | Email change | Subscriber cannot edit; admin endpoint exists; SQL in Phase 6 |
| D16 | Cancel timing | `cancel_at_period_end = true` |
| D17 | Migrations | Drizzle Kit, forward-only, applied automatically via Vercel `prebuild` script |
| D18 | API placement | Route handlers for external/auth; Server Actions for forms; Server Components for reads |
| D19 | Phase 7 reuse | `products.kind` + jsonb metadata; subscribers table generic |
| D20 | Critical tests | 8 integration tests (§15.1) |
| D21 | Test DB | Dedicated Neon branch `test` |

---

## 17. Open items for writing-plans + pre-writing-plans actions

### 17.1 Hard blockers — must complete BEFORE invoking writing-plans

- **ROADMAP reconciliation (D2 from review B5):**
  The user has WIP edits on `docs/ARCHITECTURE_AND_ROADMAP.md` that rewrote §4 to state "Modo de lanzamiento: completo, no MVP" with admin included in Phase 6. This contradicts the **committed** ROADMAP and `docs/PROJECT_CONTEXT.md:125`, both of which scope a full admin to Phase 6.5. The brainstorming-agreed decision is: **admin minimal in Phase 6, full admin in Phase 6.5.** Before writing-plans starts:
  1. Discard or revise the WIP ROADMAP edits on a separate `chore/reconcile-admin-scope` branch.
  2. Update §4 to explicitly state the split: minimal admin in Phase 6 (per this spec §9), full admin in Phase 6.5.
  3. Verify PROJECT_CONTEXT and ROADMAP both name the split consistently.
  4. Merge the chore branch to main before kicking off writing-plans.

### 17.2 Implementation questions (resolved during plan-writing)

- Exact wording / visual treatment of welcome email and the **two** failure-path emails:
  - Race-condition email — **must include**: clear apology, confirmation that the refund is automatic, expected timeline (5-10 business days for the bank to reflect the credit), and a one-click waitlist signup link (`/mentoria/waitlist?email=...`). Without the timeline, the customer checks their statement for weeks. (C5 from review B5.)
  - Duplicate-subscription email — distinct from race: "Detectamos que ya tienes una suscripción activa, te reembolsamos, ve a /cuenta" + same refund-timing reassurance.
- Exact wording on `/privacidad`
- Whether waitlist notification tracking gets a dedicated `/admin/waitlist` page in Phase 6 or stays SQL-only
- Whether the home-page mentoría card duplicates exactly the `/mentoria` card or differs
- Specific Tailwind class scaffolding for the new section
- Exact env-var names and their secrets handling per Vercel environment
- First migration must enable Postgres extensions: `citext` (for case-insensitive email) and `pgcrypto` (if using `gen_random_uuid()`)
- Whether `welcome_email_status` needs Resend bounce-webhook integration in Phase 6 or stays manual until 6.5
- Whether the rate_limit_attempts cleanup runs as a Vercel cron job or is deferred (size-driven decision)

---

## 18. References

- `docs/ARCHITECTURE_AND_ROADMAP.md` — the binding QUÉ and POR QUÉ
- `docs/PROJECT_CONTEXT.md` — project-level conventions
- `CLAUDE.md` — code conventions for this repo
- LFPDPPP — Ley Federal de Protección de Datos Personales en Posesión de los Particulares (Mexico)
- Stripe Subscriptions docs — billing cycles, Smart Retries, Customer Portal
- Stripe Smart Retries — [docs.stripe.com/billing/revenue-recovery/smart-retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries) (recommended default: up to 8 retries over 2 weeks; ML-optimized timing)
- Drizzle ORM + Neon serverless adapter

---

## 19. Revision history

### v2 — 2026-05-12 (this revision)

Incorporates 16 issues from review B5:

**P0 (blocked writing-plans):**
- A1 — Migrations strategy switched from "manual local against prod" to automated `prebuild` predeploy script via Vercel (§11).
- A2 — Added pre-checkout guard (logged-in active subscriber → 409) and webhook fallback (partial-index violation → cancel + refund + duplicate-subscription email). New §6.1.1. Test 8 added in §15.1.
- B1 — Rewrote tests 2, 4, 6 (and others) in §15.1 to verify observable behavior rather than implementation details.
- C1 — Added §13.3 covering Resend failure modes; added `welcome_email_status` column to `subscriptions`; admin "Reenviar welcome email" action.
- C2 — Added §13.2 (replay-safe webhook model with idempotency keys on every Stripe API call; stripe_events row inserted at commit point) and §13.4 (refund failure handling).
- D1 — Replaced approximate Stripe Smart Retries language with the actual recommended default (8 retries over 2 weeks, ML-optimized), with justification for using defaults. Source linked in §18.
- D2 — Documented in §17.1 the ROADMAP reconciliation requirement (chore branch before writing-plans).

**P1 (fix before execution):**
- A3 — Explicit spot-occupancy note: past_due holds spot for full retry window; only manual cancel frees early (§6.5 last paragraph).
- A4 — `customer.subscription.created` added to §13.1 webhook table as no-op with rationale.
- B2 — Added "mixed-status capacity" integration test (§15.1 test 3).
- B3 — Split rate-limit test into per-IP exceed (test 10) and per-IP isolation (test 11).
- C3 — Profile-form gate now field-level (`name OR instagram_handle OR date_of_birth IS NULL`); `profile_completed_at` reduced to audit timestamp (§7.4, §8.1).
- C4 — Magic-link tokens get a `kind` column; `welcome` tokens expire in 7 days, `login` tokens in 15 minutes (§3.6, §7.2 criterion 2).
- D3 — Rate-limit decision closed: DB-backed `rate_limit_attempts` table (new §3.9, §7.2 criterion 4).
- D4 — Rewrote §6.3 with honest cost statement of webhook delay (Instagram DM fallback acknowledged).

**P2 (review during plan):**
- A5 — `MentoriaCard` is one component with `capacityFull: boolean` prop (§4, §14).
- B4 — Pre-launch checklist (§15.3) now explicitly requires visual review of all transactional emails with real data on mobile.
- C5 — Race-condition email copy requirements (refund timing 5-10 días hábiles, reassurance) added to §17.2 as a constraint for writing-plans.
- D5 — `consent_privacy_version` format defined: ISO date string matching `PRIVACY_VERSION` constant in `/privacidad/page.tsx` (§3.4).

### v1 — 2026-05-12 (initial)

Initial spec from brainstorming session. Closed D1–D21 from `ARCHITECTURE_AND_ROADMAP.md`. Self-reviewed for placeholders/contradictions before user review.
