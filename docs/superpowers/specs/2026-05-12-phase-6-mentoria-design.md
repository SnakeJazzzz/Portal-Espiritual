# Phase 6 — Mentoría 1-a-1: Design Spec

**Status:** draft, pending user review
**Date:** 2026-05-12
**Authors:** brainstorming session (Claude Opus + Michael)
**Predecessor docs:** `docs/ARCHITECTURE_AND_ROADMAP.md`, `docs/PROJECT_CONTEXT.md`
**Next step:** writing-plans (implementation plan)

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

Eight tables. Phase-6-only; designed so Phase 7+ adds rows (and possibly columns), not table rewrites.

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
| `consent_privacy_version` | text | which `/privacidad` version they consented to |
| `notified_at` | timestamptz nullable | when admin marked them notified |
| `created_at` | timestamptz | |

### 3.5 `stripe_events`

Idempotency log. Required by principle 4.

| Column | Type | Notes |
|---|---|---|
| `stripe_event_id` | text pk | from Stripe payload |
| `type` | text | e.g. `'checkout.session.completed'` |
| `payload` | jsonb | full event for debugging |
| `processed_at` | timestamptz | |

Insert with `ON CONFLICT DO NOTHING`. If conflict, the event was already processed — webhook returns 200 immediately without re-running side effects.

### 3.6 `auth_tokens`

Magic-link single-use tokens.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `token_hash` | text unique | SHA-256 hex of the raw token |
| `subscriber_id` | uuid fk → subscribers | |
| `expires_at` | timestamptz | 15 min after creation |
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
| `action` | text | e.g. `'set_sessions_remaining'`, `'cancel_subscription'`, `'change_subscriber_email'` |
| `target_subscriber_id` | uuid fk → subscribers nullable | who was affected |
| `before` | jsonb nullable | snapshot of changed fields |
| `after` | jsonb nullable | new values |
| `created_at` | timestamptz | |

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

Server component that renders the same mentoría card (or a fuller variant) plus a longer description / benefits section. Same capacity-aware CTA. Linked from header / footer / home card if needed.

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
   - If `profile_completed_at IS NULL` → `/cuenta/perfil` (first-visit form)
   - Else → `/cuenta`

### 6.2 Cancel mid-checkout (D6)

User closes Stripe page or clicks back. Stripe redirects to `cancel_url`. Page shows: "Tu suscripción quedó pendiente. Dale otra vez al botón cuando estés listo." No emails. No DB rows.

### 6.3 Webhook latency (D7)

The success page (`/gracias`) does not depend on the webhook having fired. The email is the activation signal. Typical Stripe webhook delivery is <5s; we tolerate up to several minutes without UX impact.

**Fallback if user clicks magic link before webhook processes** (very rare; magic link is generated *by* the webhook, so this shouldn't happen — but if a separate manual login is attempted before the webhook lands, the subscriber row doesn't exist yet and login fails silently per §7.7).

### 6.4 Fallback on `/cuenta` if subscription row missing

When a logged-in subscriber visits `/cuenta` but no `subscriptions` row exists (extreme edge: webhook delayed >30s and they bypassed the email link somehow), show: "Tu suscripción se está procesando. Refresca en unos segundos." with a manual refresh button. No automatic polling.

### 6.5 Past_due handling (Option A — default Stripe)

When Stripe sends `invoice.payment_failed`:

- `subscriptions.status = 'past_due'`
- Subscriber **retains access** (sessions counter, `/cuenta`)
- Red banner on `/cuenta`: "Tu pago falló. Actualiza tu tarjeta [Abrir Stripe Customer Portal]"
- Stripe Smart Retries handles ~4 retry attempts over ~3 weeks (default configuration; do not customize)

When retry succeeds (`invoice.paid`): status flips back to `'active'`, banner disappears, sessions counter resets to 2 if it's a new billing cycle.

When all retries exhausted: Stripe sends `customer.subscription.deleted` → status `'canceled'` → spot is freed (next webhook handler will see capacity < 8).

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
2. **Expiry 15 minutes** from creation. Verify endpoint rejects expired tokens.
3. **Single-use.** `consumed_at` set on successful verify; reuse returns 401.
4. **Rate limit `POST /api/auth/login`** to 5 requests/min per IP. Returns 429 on exceed. Implementation must work across Vercel's multi-instance serverless model — pick one of: (a) DB-backed counter in a `rate_limit_attempts` table keyed by IP, or (b) Upstash Ratelimit (Redis). In-memory LRU is **not** sufficient — different requests hit different instances. Decision deferred to writing-plans.
5. **Constant-time comparison** when matching token hashes (`crypto.timingSafeEqual` on equal-length buffers).
6. **Cookies HttpOnly + Secure + SameSite=Lax.** Cookie name e.g. `pe_session`. Path `/`. Max-age 30 days.
7. **No email-existence leak.** `POST /api/auth/login` always returns 200 (or generic 429 on rate limit), regardless of whether the email exists. Email is sent only if it does.
8. **Logout deletes the session row**, not just the cookie. (Prevents replay if cookie was captured.)

### 7.3 Session model (D9)

30-day sliding window. On each request that hits a protected route, `last_seen_at` updates and `expires_at` extends to `last_seen_at + 30 days`. Logout deletes the row.

### 7.4 Role-based redirect (D10)

Single login flow. Redirect destination is determined at verify time in this order:
- `role = 'admin'` → `/admin` (admins skip the profile form entirely)
- `role = 'subscriber'` and `profile_completed_at IS NULL` → `/cuenta/perfil`
- `role = 'subscriber'` and profile complete → `/cuenta`

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

Triggered when `subscribers.profile_completed_at IS NULL`. Until submitted, no other `/cuenta` page renders — middleware redirects.

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
- **Application path:** local dev runs `npm run db:migrate` against local or branch DB. CI runs migrations against the Neon preview branch for the PR. Before merging to main, the developer runs `npm run db:migrate` against the production Neon DB manually, then merges. This is observable and reversible at the scale of Phase 6.
- **Neon preview branches:** each PR gets its own ephemeral DB branch (already configured per roadmap §10).

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

| Event | Action |
|---|---|
| `checkout.session.completed` | Atomic capacity insert; on success: upsert subscriber by email, insert subscription, create auth_token, send welcome email with magic link. On capacity failure: cancel sub + refund + send "race" email. |
| `customer.subscription.updated` | Mirror `status`, `current_period_start/end`, `cancel_at_period_end`. |
| `customer.subscription.deleted` | Set `status='canceled'`, set `canceled_at`. Spot frees. |
| `invoice.paid` | If for an active subscription's renewal: reset `sessions_remaining` to 2 (use product config in future; literal 2 in Phase 6). |
| `invoice.payment_failed` | Set `status='past_due'` (Stripe will retry per Smart Retries config). |

All events first insert into `stripe_events` with `ON CONFLICT DO NOTHING`. If the event was already processed, return 200 immediately without re-running side effects.

Webhook signature verification: use `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`. Reject with 400 on invalid signature.

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
│   ├── MentoriaCard.tsx
│   ├── MentoriaCardFull.tsx           # capacity-full variant
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
│   ├── schema.ts                      # Drizzle schema for all 8 tables
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

1. **Webhook happy path:** simulate `checkout.session.completed` → assert subscriber + subscription + auth_token rows created; Resend mock called.
2. **Capacity race:** seed 8 active rows → fire 9th webhook → assert no new subscription row, Stripe cancel mock called, refund mock called, race email sent.
3. **Webhook idempotency:** fire same event_id twice → assert one subscription row, second call no-op.
4. **Magic link single-use:** create token → verify → assert session cookie + consumed_at. Re-verify same token → 401.
5. **Auth gate:** unauthenticated request to `/cuenta` returns redirect to login.
6. **Cancel flow:** admin endpoint calls Stripe mock with `cancel_at_period_end=true`; webhook update mirrors state.
7. **Past_due → restore:** fire `invoice.payment_failed` → status past_due; fire `invoice.paid` → status active, sessions reset.
8. **Magic link security criteria** (one test per criterion in §7.2):
   - Plaintext token never in DB
   - Expired token rejected
   - Already-consumed token rejected
   - Login endpoint rate-limited
   - Login returns 200 for nonexistent email AND existing email (and no Resend call for nonexistent)
   - Cookie attributes verified

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
- Welcome email template visually reviewed on mobile (Instagram in-app browser)

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
| D17 | Migrations | Drizzle Kit, forward-only, manual application before merge |
| D18 | API placement | Route handlers for external/auth; Server Actions for forms; Server Components for reads |
| D19 | Phase 7 reuse | `products.kind` + jsonb metadata; subscribers table generic |
| D20 | Critical tests | 8 integration tests (§15.1) |
| D21 | Test DB | Dedicated Neon branch `test` |

---

## 17. Open items for writing-plans

These are *implementation* questions, not *design* questions. They get resolved during plan-writing, not now.

- Exact wording / visual treatment of welcome email and race email
- Exact wording on `/privacidad`
- Whether waitlist notification tracking gets a dedicated `/admin/waitlist` page in Phase 6 or stays SQL-only
- Whether the home-page mentoría card duplicates exactly the `/mentoria` card or differs
- Specific Tailwind class scaffolding for the new section
- Exact env-var names and their secrets handling per Vercel environment
- First migration must enable Postgres extensions: `citext` (for case-insensitive email) and `pgcrypto` (if using `gen_random_uuid()`)
- Specific choice between DB-backed rate-limit and Upstash for `/api/auth/login`

---

## 18. References

- `docs/ARCHITECTURE_AND_ROADMAP.md` — the binding QUÉ and POR QUÉ
- `docs/PROJECT_CONTEXT.md` — project-level conventions
- `CLAUDE.md` — code conventions for this repo
- LFPDPPP — Ley Federal de Protección de Datos Personales en Posesión de los Particulares (Mexico)
- Stripe Subscriptions docs — billing cycles, Smart Retries, Customer Portal
- Drizzle ORM + Neon serverless adapter
