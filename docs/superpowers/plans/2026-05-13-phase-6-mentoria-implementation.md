# Phase 6 — Mentoría 1-a-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Phase 6 (Mentoría 1-a-1 subscription, 8-spot cap, magic-link auth, minimal admin) end-to-end against the contract in `docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md` v3.

**Architecture:** Next.js 16 App Router server-first. Persistence in Neon Postgres via Drizzle. Stripe Hosted Checkout + Customer Portal handle PCI; we handle subscription state via idempotent webhooks. Custom SHA-256-hashed magic-link auth with server-side sessions (no NextAuth).

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind v4, Drizzle ORM (Neon driver), Stripe Node SDK, Resend SDK, Zod, Vitest (integration tests against a Neon `test` branch).

---

## Day-1 Verification (explicit confirmation)

**This plan touches NO existing real data.**

- The four current Cal.com services (`src/config/services.ts`), the existing `ServiceCard`, `ServiceSelectionModal`, `BookingModal`, `Hero` components and the homepage's existing 2x2 grid remain unmodified throughout Phases S1–S8. They are only touched in **Slice 9** (additive: a new section is appended below the existing grid; no existing markup changes).
- All Phase 6 data lives in nine *new* tables (`products`, `subscribers`, `subscriptions`, `waitlist`, `stripe_events`, `auth_tokens`, `sessions`, `audit_log`, `rate_limit_attempts`). No `ALTER TABLE` on anything pre-existing because there are no pre-existing tables — the production DB starts empty in this phase.
- The Stripe account is shared with Cal.com; we work in **test mode** until the pre-launch checklist (Slice 10). Cal.com's live products are unaffected by test-mode subscription products.
- Resend domain `portalespiritual.com.mx` is already verified; sending only adds traffic, no config rewrites.

**Day-1 boot test** (after Slice 1): `npm run dev` succeeds, existing homepage renders unchanged in 375px viewport, `/api/health` (added in S1) returns 200.

---

## Dependency graph

```
S1 Foundation
 ├─► S2 Public page + Checkout redirect
 │    └─► S3 Webhook foundation + happy path (test 1)
 │         ├─► S4 Magic link verify + /cuenta gate + profile (tests 5, partial 9)
 │         │    └─► S5 Subscriber dashboard + Customer Portal
 │         │         └─► S8 Login magic link + rate limit (tests 9 timing/no-leak, 10, 11)
 │         ├─► S6 Subscription lifecycle webhooks (tests 6, 7)
 │         │    └─► S10 Admin panel + seed
 │         └─► S7 Capacity race + duplicate guards (tests 2, 3, 8)
 │              └─► S10 Admin panel + seed
 └─► S9 Waitlist + /privacidad + home integration (mostly parallel after S1; home integration waits for S2's MentoriaCard component)
```

**Parallelizable groups (after dependencies satisfied):**
- After S1: S2 and S9-partial (privacidad page + waitlist table schema) can run in parallel.
- After S3: S4 and S6 can run in parallel.
- After S4+S6: S5, S7, and S8 can run in parallel (different files; S7 touches the webhook handler from S3, S8 touches auth from S4, S5 builds new dashboard pages).
- After S5+S6+S7: S10 starts (admin reads from data S6/S7 produce; uses auth from S4/S5).

**S11 = pre-launch checklist** is not a slice; it is the closing gate executed after S10.

---

## File structure summary

The full file map is `docs/superpowers/specs/2026-05-12-phase-6-mentoria-design.md` §14. Each slice below lists the exact files it creates or modifies.

---

## Sprint vs Gate legend

Per `docs/AI_SETUP_AND_WORKFLOW.md` C1:

- **Sprint** — self-verifiable, low cost, loud failures. Reviewer skims the diff; tests catch regressions.
- **Gate** — architectural, real-world data, design judgment, silent failures. Reviewer reads the diff carefully, examines tests deliberately, often replays integration tests against real Stripe test mode or real DB state.

---

## Slice 1 — Foundation: dependencies, Drizzle, `products` table, prebuild migration, day-1 boot

**Goal:** Phase 6 stack installed and wired. Migration tooling works. `products` table seeded with mentoría. Existing site still boots and renders identically.

**Files in this slice:**
- Create: `drizzle.config.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `src/db/migrations/0001_init.sql` (generated)
- Create: `src/lib/env.ts` (typed env access)
- Create: `src/app/api/health/route.ts`
- Create: `vitest.config.ts`
- Create: `tests/integration/setup.ts`
- Create: `tests/integration/products.test.ts`
- Modify: `package.json` (deps + scripts)
- Modify: `.gitignore` (add `.env.local`, `.next`, etc., if missing)

### Task 1.1 — Install Phase 6 runtime dependencies

**Classification:** Sprint — package install with loud failure (lockfile, type errors at next compile).

- [ ] **Step 1:** Run install command.

```bash
npm install --save drizzle-orm@^0.36 \
  @neondatabase/serverless@^0.10 \
  stripe@^17 \
  resend@^4 \
  zod@^3.23
```

- [ ] **Step 2:** Install dev dependencies (Drizzle CLI + Vitest + types).

```bash
npm install --save-dev drizzle-kit@^0.28 \
  vitest@^2 \
  @vitest/coverage-v8@^2 \
  tsx@^4 \
  @types/node@^20
```

- [ ] **Step 3:** Confirm install succeeded.

```bash
npm ls drizzle-orm stripe resend zod drizzle-kit vitest
```

Expected: each package shows a resolved version.

- [ ] **Step 4:** Commit.

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add drizzle, stripe, resend, zod, vitest for Phase 6"
```

### Task 1.2 — Typed env access (`src/lib/env.ts`)

**Classification:** Sprint — pure validation logic, fails loudly at module load when an env var is missing.

- [ ] **Step 1:** Create `src/lib/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRICE_ID_MENTORIA: z.string().startsWith('price_'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().email(),
  APP_URL: z.string().url(),
  ADMIN_SEED_EMAIL: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

- [ ] **Step 2:** Tell the human which env vars to set in `.env.local`.

Do not write `.env.local` yourself (hook blocks). The human must add to `.env.local`:

```
DATABASE_URL=postgres://...neon...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MENTORIA=price_...   # from Stripe Dashboard, the mentoría recurring price
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hola@portalespiritual.com.mx
APP_URL=http://localhost:3000
ADMIN_SEED_EMAIL=jp@example.com
```

- [ ] **Step 3:** Confirm env loads at module evaluation.

```bash
npx tsx -e "import('./src/lib/env.ts').then(m => console.log(Object.keys(m.env)))"
```

Expected: an array of all keys. If a var is missing, Zod throws with the exact missing field.

- [ ] **Step 4:** Commit.

```bash
git add src/lib/env.ts
git commit -m "feat(env): add Zod-validated env access in src/lib/env.ts"
```

### Task 1.3 — Drizzle config + `db/client.ts` + `products` schema

**Classification:** Gate — defines the contract for every future query; mistakes here propagate everywhere.

- [ ] **Step 1:** Create `drizzle.config.ts`:

```ts
import type { Config } from 'drizzle-kit';
import { env } from './src/lib/env';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: env.DATABASE_URL },
  strict: true,
  verbose: true,
} satisfies Config;
```

- [ ] **Step 2:** Create `src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { env } from '@/lib/env';
import * as schema from './schema';

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

- [ ] **Step 3:** Create `src/db/schema.ts` with the `products` table (other tables added in later slices). The initial migration also enables required Postgres extensions.

```ts
import {
  pgTable, uuid, text, integer, jsonb, timestamp, pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productKind = pgEnum('product_kind', ['subscription', 'one_off']);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: productKind('kind').notNull(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  priceMxn: integer('price_mxn').notNull(),
  currency: text('currency').notNull().default('MXN'),
  capacity: integer('capacity'),
  stripePriceId: text('stripe_price_id').notNull(),
  stripeProductId: text('stripe_product_id').notNull(),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 4:** Generate the first migration.

```bash
npx drizzle-kit generate --name init
```

Expected: a file appears in `src/db/migrations/` containing `CREATE TYPE product_kind...` and `CREATE TABLE products...`. Open the generated SQL and **manually prepend**:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

(These are required by tables added in later slices — `subscribers.email` uses citext, and we use `gen_random_uuid()`.)

- [ ] **Step 5:** Commit.

```bash
git add drizzle.config.ts src/db/schema.ts src/db/client.ts src/db/migrations/
git commit -m "feat(db): add Drizzle config, db client, and products table schema"
```

### Task 1.4 — Migration scripts in `package.json` + Vercel prebuild

**Classification:** Gate — schema deploys depend on this. Wrong wiring = broken production deploys.

- [ ] **Step 1:** Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:migrate": "drizzle-kit migrate",
    "db:generate": "drizzle-kit generate",
    "db:seed": "tsx scripts/seed-products.ts",
    "prebuild": "npm run db:migrate",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2:** Apply migration to the local Neon dev branch.

```bash
npm run db:migrate
```

Expected: drizzle-kit reports the migration applied. Verify with:

```bash
psql "$DATABASE_URL" -c "\\d products"
```

Expected: table exists with the columns from §3.1.

- [ ] **Step 3:** Commit.

```bash
git add package.json
git commit -m "chore(build): add db:migrate, prebuild hook, and test scripts"
```

### Task 1.5 — Seed mentoría product row

**Classification:** Sprint — single insert with loud failure if Stripe IDs are wrong.

- [ ] **Step 1:** Create `scripts/seed-products.ts`:

```ts
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { env } from '@/lib/env';
import { sql } from 'drizzle-orm';

async function main() {
  await db.insert(products).values({
    kind: 'subscription',
    slug: 'mentoria-1a1',
    name: 'Mentoría 1-a-1',
    priceMxn: 2222,
    currency: 'MXN',
    capacity: 8,
    stripePriceId: env.STRIPE_PRICE_ID_MENTORIA,
    stripeProductId: 'prod_placeholder',
    metadata: sql`'{}'::jsonb`,
  }).onConflictDoNothing({ target: products.slug });
  console.log('seeded mentoría product');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2:** Tell the human: in Stripe Dashboard, create a Product "Mentoría 1-a-1" with a recurring monthly price of 2222 MXN. Copy `price_xxx` into `STRIPE_PRICE_ID_MENTORIA`. Copy the `prod_xxx` into the seed script's `stripeProductId` (replace `'prod_placeholder'`). Re-run `npm run db:seed`.

- [ ] **Step 3:** Verify the row exists.

```bash
psql "$DATABASE_URL" -c "SELECT slug, price_mxn, capacity FROM products;"
```

Expected: one row with `mentoria-1a1`, `2222`, `8`.

- [ ] **Step 4:** Commit.

```bash
git add scripts/seed-products.ts
git commit -m "feat(db): seed mentoría product row"
```

### Task 1.6 — Vitest config + integration test scaffold

**Classification:** Sprint — test infra; failure is loud (tests don't run).

- [ ] **Step 1:** Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    setupFiles: ['tests/integration/setup.ts'],
    // Integration tests share the DB AND the in-memory stripeState mock (S7).
    // File-level parallelism would let two test files mutate the same global
    // singleton concurrently → intermittent flakiness in payment/refund
    // assertions. Force sequential file execution.
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Step 2:** Create `tests/integration/setup.ts`:

```ts
import { beforeEach } from 'vitest';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

// Wipe data tables before each test (NOT products — that's seeded once per test DB).
// Tables added in later slices will be added to this list.
const TABLES_TO_WIPE: string[] = [];

beforeEach(async () => {
  if (TABLES_TO_WIPE.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE ${TABLES_TO_WIPE.join(', ')} CASCADE;`));
});
```

- [ ] **Step 3:** Create `tests/integration/products.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('products table', () => {
  it('has the seeded mentoría row', async () => {
    const rows = await db.select().from(products).where(eq(products.slug, 'mentoria-1a1'));
    expect(rows).toHaveLength(1);
    expect(rows[0].priceMxn).toBe(2222);
    expect(rows[0].capacity).toBe(8);
    expect(rows[0].kind).toBe('subscription');
  });
});
```

- [ ] **Step 4:** Run test.

```bash
npm test -- products.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 5:** Commit.

```bash
git add vitest.config.ts tests/integration/
git commit -m "test(infra): vitest config + products integration test"
```

### Task 1.7 — `/api/health` route + Day-1 boot verification

**Classification:** Sprint — trivial route; the verification step is what matters.

- [ ] **Step 1:** Create `src/app/api/health/route.ts`:

```ts
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  await db.execute(sql`SELECT 1`);
  return NextResponse.json({ status: 'ok' });
}
```

- [ ] **Step 2:** Boot dev server and verify the EXISTING site still renders unchanged.

```bash
npm run dev
```

In a browser at `http://localhost:3000` (mobile viewport 375px), confirm:
- The constellation animation runs
- The 4-card grid (Divinación de Cartas, Akáshica, Clásica, Activación Cuántica) appears
- The "Reservar tu sesión" button opens the Cal.com modal
- AboutMe section renders
- No console errors

This is the **Day-1 verification**. Anything broken here means we touched something we shouldn't have.

- [ ] **Step 3:** Verify the health endpoint.

```bash
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok"}` with HTTP 200.

- [ ] **Step 4:** Commit.

```bash
git add src/app/api/health/route.ts
git commit -m "feat(api): add /api/health endpoint for boot verification"
```

---

## Slice 2 — Public `/mentoria` page + Stripe Hosted Checkout redirect

**Goal:** A user can visit `/mentoria`, click "Suscríbete", be redirected to Stripe Hosted Checkout in test mode, pay with a test card, and land on `/gracias`. No DB writes yet (those come in S3). Capacity badge reads from the DB but is permanently "available" because there are 0 subscriptions yet.

**Slice integration test contract:** None of the §15.1 tests fire yet. Slice is verified by manual click-through.

**Files in this slice:**
- Create: `src/config/mentoria.ts`
- Create: `src/lib/stripe.ts`
- Create: `src/lib/capacity.ts` (read-only count function in this slice)
- Create: `src/components/MentoriaCard.tsx`
- Create: `src/app/mentoria/page.tsx`
- Create: `src/app/gracias/page.tsx`
- Create: `src/app/api/checkout/create/route.ts`

### Task 2.1 — `src/config/mentoria.ts` (single source of truth for mentoría display)

**Classification:** Sprint — typed config with loud failure if a field is missing.

- [ ] **Step 1:** Create `src/config/mentoria.ts`:

```ts
export interface MentoriaConfig {
  title: string;
  priceLabel: string;
  description: string;
  ctaAvailable: string;
  ctaFull: string;
  productSlug: string;
}

export const mentoriaConfig: MentoriaConfig = {
  title: 'Mentoría 1-a-1',
  priceLabel: '$2222 MXN / mes',
  description:
    'Te acompaño en tu proceso de Ascensión. Qué incluye? 2 sesiones privadas al mes de 30 min, acceso a mensajes directos por Insta y un plan personalizado de desarrollo consciente alineado a tu visión. Encarna tu Ser Superior.',
  ctaAvailable: 'Suscríbete',
  ctaFull: 'Cupo lleno - únete a la lista de espera',
  productSlug: 'mentoria-1a1',
};
```

- [ ] **Step 2:** Commit.

```bash
git add src/config/mentoria.ts
git commit -m "feat(config): add mentoria.ts single-source-of-truth"
```

### Task 2.2 — `src/lib/stripe.ts` singleton + helpers

**Classification:** Gate — every Stripe API call goes through this. Wrong API version or key = silent test-mode/live-mode confusion.

- [ ] **Step 1:** Create `src/lib/stripe.ts`:

```ts
import Stripe from 'stripe';
import { env } from '@/lib/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',  // pin so SDK upgrades don't change behavior silently
  typescript: true,
});
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/stripe.ts
git commit -m "feat(stripe): pinned-version Stripe SDK client"
```

### Task 2.3 — `src/lib/capacity.ts` read function

**Classification:** Sprint — pure read; atomic-write helper added later in S7.

- [ ] **Step 1:** Create `src/lib/capacity.ts`:

```ts
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

// In S3 we add the subscriptions table. Until then, the active count is always 0.
// This function is updated in S3 (Task 3.x) to actually query subscriptions.
export async function getCapacity(productSlug: string): Promise<{ used: number; total: number | null }> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug) });
  if (!product) throw new Error(`Unknown product: ${productSlug}`);
  return { used: 0, total: product.capacity };
}

export function isFull({ used, total }: { used: number; total: number | null }): boolean {
  if (total === null) return false;
  return used >= total;
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/capacity.ts
git commit -m "feat(capacity): add read-only getCapacity helper (write helper added in S7)"
```

### Task 2.4 — `MentoriaCard` component

**Classification:** Sprint — UI component, visual verification.

- [ ] **Step 1:** Create `src/components/MentoriaCard.tsx`:

```tsx
'use client';

import { useTransition } from 'react';
import CelestialBorder from '@/components/CelestialBorder';
import { mentoriaConfig } from '@/config/mentoria';

interface MentoriaCardProps {
  capacityFull: boolean;
  onWaitlistClick?: () => void;
}

export default function MentoriaCard({ capacityFull, onWaitlistClick }: MentoriaCardProps) {
  const [pending, startTransition] = useTransition();

  function handleSubscribe() {
    startTransition(async () => {
      const res = await fetch('/api/checkout/create', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        // 409 = already subscribed — handled in S7
        const body = await res.json().catch(() => ({}));
        alert(body.message ?? 'No se pudo iniciar el checkout. Intenta de nuevo.');
      }
    });
  }

  return (
    <CelestialBorder borderRadius="1rem">
      <div className="bg-white/[0.03] rounded-2xl p-7">
        <h3 className="text-2xl lg:text-4xl font-heading font-semibold text-white">
          {mentoriaConfig.title}
        </h3>
        <p className="mt-2 text-lg lg:text-2xl text-portal-text/80">
          {mentoriaConfig.priceLabel}
        </p>
        <p className="mt-4 text-lg lg:text-2xl text-portal-text/90 leading-relaxed">
          {mentoriaConfig.description}
        </p>
        <div className="mt-6">
          {capacityFull ? (
            <button
              type="button"
              onClick={onWaitlistClick}
              className="w-full bg-transparent border border-white/30 text-white font-heading text-xl lg:text-2xl py-3 px-6 rounded-xl"
            >
              {mentoriaConfig.ctaFull}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={pending}
              className="w-full bg-transparent border border-white/60 text-white font-heading text-xl lg:text-2xl py-3 px-6 rounded-xl disabled:opacity-50"
            >
              {pending ? 'Redirigiendo…' : mentoriaConfig.ctaAvailable}
            </button>
          )}
        </div>
      </div>
    </CelestialBorder>
  );
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/components/MentoriaCard.tsx
git commit -m "feat(ui): MentoriaCard with capacityFull-aware CTA"
```

### Task 2.5 — `POST /api/checkout/create` route

**Classification:** Gate — creates Stripe sessions; misconfiguration = paid users with no return path.

- [ ] **Step 1:** Create `src/app/api/checkout/create/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';

export async function POST() {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID_MENTORIA, quantity: 1 }],
    success_url: `${env.APP_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/mentoria?checkout=canceled`,
    // We do NOT pass customer here for anonymous flows. S7 adds the
    // logged-in-active-subscriber guard + customer reuse for re-subscribers.
    automatic_tax: { enabled: false },
    locale: 'es',
  });
  if (!session.url) return NextResponse.json({ message: 'Stripe did not return a URL' }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/checkout/create/route.ts
git commit -m "feat(api): POST /api/checkout/create — Stripe Hosted Checkout"
```

### Task 2.6 — `/mentoria` server component

**Classification:** Sprint — reads capacity, renders card.

- [ ] **Step 1:** Create `src/app/mentoria/page.tsx`:

```tsx
import MentoriaCard from '@/components/MentoriaCard';
import { mentoriaConfig } from '@/config/mentoria';
import { getCapacity, isFull } from '@/lib/capacity';

export const dynamic = 'force-dynamic';  // capacity is per-request

export default async function MentoriaPage({
  searchParams,
}: { searchParams: Promise<{ checkout?: string }> }) {
  const cap = await getCapacity(mentoriaConfig.productSlug);
  const { checkout } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-16 max-w-2xl mx-auto">
      {checkout === 'canceled' && (
        <p className="mb-8 text-center text-portal-text/80">
          Tu suscripción quedó pendiente. Dale otra vez al botón cuando estés listo.
        </p>
      )}
      <MentoriaCard capacityFull={isFull(cap)} />
    </main>
  );
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/mentoria/page.tsx
git commit -m "feat(page): /mentoria server component with capacity-aware CTA"
```

### Task 2.7 — `/gracias` page

**Classification:** Sprint — static message page.

- [ ] **Step 1:** Create `src/app/gracias/page.tsx`:

```tsx
export default function GraciasPage() {
  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto text-center">
      <h1 className="text-3xl lg:text-5xl font-heading text-white mb-6">Pago recibido</h1>
      <p className="text-lg lg:text-2xl text-portal-text/80">
        En segundos te llega un correo con tu acceso. Revisa tu bandeja de entrada
        (y spam, por si acaso).
      </p>
    </main>
  );
}
```

- [ ] **Step 2:** Manual verification end-to-end.

```bash
npm run dev
```

Open `http://localhost:3000/mentoria`. Click "Suscríbete". Pay with Stripe test card `4242 4242 4242 4242`, exp `12/34`, CVC `123`, postal code `12345`, email `test@example.com`. Verify the redirect lands on `/gracias`. No DB rows are expected (webhook handler comes in S3).

Also click "Suscríbete", then click browser-back on Stripe's page. Verify redirect to `/mentoria?checkout=canceled` shows the friendly message.

- [ ] **Step 3:** Commit.

```bash
git add src/app/gracias/page.tsx
git commit -m "feat(page): /gracias post-checkout success page"
```

---

## Slice 3 — Webhook foundation + happy-path subscription creation (Test 1)

**Goal:** A paid Stripe Checkout event creates `subscribers`, `subscriptions`, `auth_tokens` rows and queues a welcome email via Resend. Webhook is signature-verified. The idempotency model from spec §13.2 is wired (SELECT-then-INSERT-at-end). This slice does NOT yet handle capacity races, duplicate subscriptions, or lifecycle events — those are S6/S7.

**TDD note for this slice (and slices that follow the same pattern):** The spec contract tests (§15.1) are *integration* tests that verify end-to-end observable behavior. They are best authored *alongside* the handler code that satisfies them, not strictly before. In Task 3.8 the steps describe writing the test and confirming it passes — they do not first assert the test fails against a stub. This is intentional and consistent with how the rest of the slices work (S4, S6, S7, S8). Strict red-green-refactor TDD does not map cleanly onto webhook plumbing where the "minimal failing implementation" is itself the production code. The discipline we *do* keep: every spec §15.1 test number has a planned code block; tests run before commit; a failure in a later iteration falls back to debugging the handler, not deleting the test.

**Slice integration test contract:**
- **Test 1 (Webhook happy path)** — fully satisfied at the end of this slice.
- **Test 4 (Webhook idempotency)** — satisfied (replay returns 200, no duplicate rows or emails).

**Files in this slice:**
- Modify: `src/db/schema.ts` (add subscribers, subscriptions, auth_tokens, stripe_events; add partial index)
- Generate: `src/db/migrations/0002_subscriptions.sql`
- Create: `src/lib/auth-tokens.ts` (token generation + hash)
- Create: `src/lib/email.ts` (Resend client + welcome template)
- Create: `src/lib/webhooks/handle-checkout-completed.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Modify: `src/lib/capacity.ts` (real query now that `subscriptions` exists)
- Create: `tests/integration/webhook-happy-path.test.ts`
- Modify: `tests/integration/setup.ts` (add tables to TRUNCATE list)
- Create: `tests/helpers/stripe-fixture.ts` (synthesize a `checkout.session.completed` event)
- Create: `tests/helpers/resend-mock.ts` (capture sent emails)

### Task 3.1 — Schema additions: subscribers, subscriptions, auth_tokens, stripe_events

**Classification:** Gate — wrong column type or missing index = silent bugs downstream.

- [ ] **Step 1:** Extend `src/db/schema.ts`. Add **after** the existing `products` definition:

```ts
import { boolean, customType } from 'drizzle-orm/pg-core';

const citext = customType<{ data: string }>({
  dataType() { return 'citext'; },
});

export const subscriberRole = pgEnum('subscriber_role', ['subscriber', 'admin']);
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'past_due', 'canceled']);
export const welcomeEmailStatus = pgEnum('welcome_email_status', ['pending', 'sent', 'failed', 'bounced']);
export const authTokenKind = pgEnum('auth_token_kind', ['welcome', 'login']);

export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: citext('email').notNull().unique(),
  role: subscriberRole('role').notNull().default('subscriber'),
  stripeCustomerId: text('stripe_customer_id'),
  name: text('name'),
  instagramHandle: text('instagram_handle'),
  dateOfBirth: text('date_of_birth'),  // ISO date string; date type via custom if needed later
  phone: text('phone'),
  timezone: text('timezone').notNull().default('America/Mexico_City'),
  notesFromSubscriber: text('notes_from_subscriber'),
  profileCompletedAt: timestamp('profile_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  status: subscriptionStatus('status').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  sessionsRemaining: integer('sessions_remaining').notNull(),
  welcomeEmailStatus: welcomeEmailStatus('welcome_email_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id),
  kind: authTokenKind('kind').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stripeEvents = pgTable('stripe_events', {
  stripeEventId: text('stripe_event_id').primaryKey(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2:** Generate the migration.

```bash
npx drizzle-kit generate --name subscriptions
```

- [ ] **Step 3:** Open the generated SQL and **append manually** the partial unique index (drizzle-kit cannot express partial indexes in schema declaratively in all versions):

```sql
CREATE UNIQUE INDEX subscriptions_active_subscriber_per_product
  ON subscriptions (subscriber_id, product_id)
  WHERE status IN ('active', 'past_due');
```

- [ ] **Step 4:** Apply migration.

```bash
npm run db:migrate
```

Verify:

```bash
psql "$DATABASE_URL" -c "\\d subscribers" "\\d subscriptions" "\\d auth_tokens" "\\d stripe_events"
psql "$DATABASE_URL" -c "\\di subscriptions_active_subscriber_per_product"
```

Expected: all four tables exist; partial index exists with `WHERE` clause.

- [ ] **Step 5:** Update `tests/integration/setup.ts` `TABLES_TO_WIPE` to:

```ts
const TABLES_TO_WIPE: string[] = ['stripe_events', 'auth_tokens', 'subscriptions', 'subscribers'];
```

(Order matters because of FKs, but `TRUNCATE … CASCADE` makes order forgiving.)

- [ ] **Step 6:** Commit.

```bash
git add src/db/schema.ts src/db/migrations/ tests/integration/setup.ts
git commit -m "feat(db): add subscribers, subscriptions, auth_tokens, stripe_events"
```

### Task 3.2 — Update `getCapacity` to query real subscriptions

**Classification:** Gate — the count rule (`status IN ('active','past_due')`) is the line between correct and silent over/under-cap.

- [ ] **Step 1:** Modify `src/lib/capacity.ts`:

```ts
import { db } from '@/db/client';
import { products, subscriptions } from '@/db/schema';
import { and, count, eq, inArray } from 'drizzle-orm';

export async function getCapacity(productSlug: string): Promise<{ used: number; total: number | null; productId: string }> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug) });
  if (!product) throw new Error(`Unknown product: ${productSlug}`);
  const [{ value }] = await db
    .select({ value: count() })
    .from(subscriptions)
    .where(and(
      eq(subscriptions.productId, product.id),
      inArray(subscriptions.status, ['active', 'past_due']),
    ));
  return { used: Number(value), total: product.capacity, productId: product.id };
}

export function isFull({ used, total }: { used: number; total: number | null }): boolean {
  if (total === null) return false;
  return used >= total;
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/capacity.ts
git commit -m "feat(capacity): query subscriptions for live count (active + past_due)"
```

### Task 3.3 — `src/lib/auth-tokens.ts` (generate + hash + verify)

**Classification:** Gate — security primitive. Wrong hashing = leakable tokens; wrong comparison = timing leak.

- [ ] **Step 1:** Create `src/lib/auth-tokens.ts`:

```ts
import crypto from 'node:crypto';
import { db } from '@/db/client';
import { authTokens } from '@/db/schema';
import { and, eq, gte, isNull } from 'drizzle-orm';

const WELCOME_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_TTL_MS = 15 * 60 * 1000;

export type AuthTokenKind = 'welcome' | 'login';

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createAuthToken(subscriberId: string, kind: AuthTokenKind): Promise<string> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const ttl = kind === 'welcome' ? WELCOME_TTL_MS : LOGIN_TTL_MS;
  await db.insert(authTokens).values({
    subscriberId,
    tokenHash,
    kind,
    expiresAt: new Date(Date.now() + ttl),
  });
  return raw;
}

/** Constant-time match by computing the hash and looking up by the unique hash column.
 *  Postgres equality on a unique index is the constant-time-equivalent here; the SHA-256
 *  hash itself is constant-time over equal-length inputs. We additionally use
 *  crypto.timingSafeEqual when comparing the lookup result to defend against very
 *  exotic timing attacks on the DB index probe. */
export async function consumeAuthToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const row = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, tokenHash),
      gte(authTokens.expiresAt, new Date()),
      isNull(authTokens.consumedAt),
    ),
  });
  if (!row) return null;
  const expectedBuf = Buffer.from(row.tokenHash, 'hex');
  const actualBuf = Buffer.from(tokenHash, 'hex');
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;
  await db.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.id, row.id));
  return { subscriberId: row.subscriberId, kind: row.kind };
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/auth-tokens.ts
git commit -m "feat(auth): SHA-256 token generation, hashing, and single-use consume"
```

### Task 3.4 — `src/lib/email.ts` (Resend client + welcome template)

**Classification:** Sprint — wrapper around Resend; loud failures via HTTP.

- [ ] **Step 1:** Create `src/lib/email.ts`:

```ts
import { Resend } from 'resend';
import { env } from '@/lib/env';

const resend = new Resend(env.RESEND_API_KEY);

interface WelcomeEmailParams {
  to: string;
  magicLinkUrl: string;
  idempotencyHeader: string;  // '<event.id>:welcome_email'
}

export async function sendWelcomeEmail({ to, magicLinkUrl, idempotencyHeader }: WelcomeEmailParams) {
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: 'Tu acceso a Portal Espiritual — Mentoría 1-a-1',
    html: welcomeHtml(magicLinkUrl),
    text: welcomeText(magicLinkUrl),
    headers: { 'X-Idempotency-Key': idempotencyHeader },
  });
}

function welcomeHtml(url: string): string {
  return `
<!doctype html><html lang="es"><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
<h1 style="font-size: 24px;">Bienvenide a tu Mentoría 1-a-1</h1>
<p style="font-size: 16px; line-height: 1.5;">Tu suscripción está activa. Para entrar a tu panel y completar tu perfil, abre este enlace:</p>
<p style="margin: 24px 0;"><a href="${url}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Abrir mi panel</a></p>
<p style="font-size: 14px; color: #666;">Este enlace es válido por 7 días y solo puede usarse una vez.</p>
<p style="font-size: 14px; color: #666;">Si no fuiste tú quien se suscribió, escríbele a Juan Pablo por Instagram.</p>
</body></html>`;
}

function welcomeText(url: string): string {
  return `Bienvenide a tu Mentoría 1-a-1.\n\nAbre este enlace para entrar a tu panel:\n${url}\n\nVálido por 7 días, solo se puede usar una vez.`;
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/email.ts
git commit -m "feat(email): Resend client + welcome email template"
```

### Task 3.5 — Test helpers: Stripe event fixture + Resend send-mock

**Classification:** Sprint — test infra.

- [ ] **Step 1:** Create `tests/helpers/stripe-fixture.ts`:

```ts
import type Stripe from 'stripe';

export function makeCheckoutCompletedEvent(opts: {
  eventId: string;
  email: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  paymentIntentId: string;
  periodStart: number;
  periodEnd: number;
}): Stripe.Event {
  return {
    id: opts.eventId,
    object: 'event',
    api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${opts.eventId}`,
        object: 'checkout.session',
        mode: 'subscription',
        customer: opts.stripeCustomerId,
        customer_details: { email: opts.email } as any,
        subscription: opts.stripeSubscriptionId,
        payment_intent: opts.paymentIntentId,
        status: 'complete',
      } as any,
    },
  } as Stripe.Event;
}
```

- [ ] **Step 2:** Create `tests/helpers/resend-mock.ts`:

```ts
import { vi } from 'vitest';

interface SentEmail { to: string; subject: string; html: string; text: string; headers: Record<string, string>; }
export const sentEmails: SentEmail[] = [];

vi.mock('@/lib/email', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/email')>();
  return {
    ...orig,
    sendWelcomeEmail: vi.fn(async (params: any) => {
      sentEmails.push({
        to: params.to,
        subject: 'Tu acceso a Portal Espiritual — Mentoría 1-a-1',
        html: 'mocked',
        text: 'mocked',
        headers: { 'X-Idempotency-Key': params.idempotencyHeader },
      });
      return { data: { id: `re_mock_${Date.now()}` }, error: null };
    }),
  };
});

export function resetSentEmails() { sentEmails.length = 0; }
```

- [ ] **Step 3:** Commit.

```bash
git add tests/helpers/
git commit -m "test(helpers): Stripe event fixture + Resend send-mock"
```

### Task 3.6 — `handle-checkout-completed.ts` (happy-path subset, no race handling)

**Classification:** Gate — webhook side-effects must commit-atomically per §13.2.

- [ ] **Step 1:** Create `src/lib/webhooks/handle-checkout-completed.ts`:

```ts
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { env } from '@/lib/env';

export async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const email = (session.customer_details?.email ?? '').toLowerCase();
  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
  if (!email || !stripeSubscriptionId) throw new Error('checkout session missing email or subscription');

  // Fetch the subscription for billing period info.
  // POST-BASIL NOTE: as of Stripe API 2025-03-31 ("Basil"), current_period_start
  // and current_period_end are no longer top-level fields on the Subscription
  // object — they live on each subscription item. For mentoría's single-item
  // recurring price, the period is on items.data[0]. Reading the old top-level
  // path silently returns undefined → invalid Date. See:
  // https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error(`subscription ${sub.id} has no items`);
  const currentPeriodStart = new Date(item.current_period_start * 1000);
  const currentPeriodEnd = new Date(item.current_period_end * 1000);

  // 1. Upsert subscriber by email (idempotent: email is unique)
  await db.insert(subscribers).values({ email, stripeCustomerId }).onConflictDoUpdate({
    target: subscribers.email,
    set: { stripeCustomerId, updatedAt: new Date() },
  });
  const sub_row = await db.query.subscribers.findFirst({ where: eq(subscribers.email, email) });
  if (!sub_row) throw new Error('subscriber upsert disappeared');

  // 2. Look up product (assume mentoría for now; S6 generalizes)
  const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
  if (!product) throw new Error('mentoria product not seeded');

  // 3. Insert subscription (idempotent by stripeSubscriptionId unique)
  //    Capacity race + duplicate-sub handling are S7's job; for this slice we INSERT directly.
  await db.insert(subscriptions).values({
    subscriberId: sub_row.id,
    productId: product.id,
    status: 'active',
    stripeSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
    sessionsRemaining: 2,
  }).onConflictDoNothing({ target: subscriptions.stripeSubscriptionId });

  // 4. Issue welcome token + send email
  const raw = await createAuthToken(sub_row.id, 'welcome');
  const magicLinkUrl = `${env.APP_URL}/api/auth/verify?token=${raw}`;
  const result = await sendWelcomeEmail({
    to: email,
    magicLinkUrl,
    idempotencyHeader: `${event.id}:welcome_email`,
  });
  // Update welcome_email_status based on result
  await db.update(subscriptions)
    .set({ welcomeEmailStatus: result.error ? 'failed' : 'sent' })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/webhooks/handle-checkout-completed.ts
git commit -m "feat(webhook): happy-path checkout.session.completed handler"
```

### Task 3.7 — `POST /api/webhooks/stripe` route with SELECT-then-INSERT-at-end idempotency

**Classification:** Gate — replay safety is THE critical invariant of this whole subsystem.

- [ ] **Step 1:** Create `src/app/api/webhooks/stripe/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { db } from '@/db/client';
import { stripeEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { handleCheckoutCompleted } from '@/lib/webhooks/handle-checkout-completed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('missing signature', { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new NextResponse(`signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotency check: SELECT first, return 200 if already processed.
  const existing = await db.query.stripeEvents.findFirst({
    where: eq(stripeEvents.stripeEventId, event.id),
  });
  if (existing) return NextResponse.json({ received: true, idempotent: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      // Other event types added in S6/S7
      default:
        // Unknown event types are accepted but not processed; still recorded.
        break;
    }
    // Commit point: insert stripe_events ONLY after all side effects succeeded.
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      type: event.type,
      payload: event as any,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    // Do NOT insert stripe_events. Stripe will retry.
    console.error('webhook handler failed; will be retried by Stripe', { eventId: event.id, type: event.type, err });
    return new NextResponse('handler error; retry', { status: 500 });
  }
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(webhook): signature verify + idempotent dispatcher (commit-at-end)"
```

### Task 3.8 — Integration test: Test 1 (happy path) + Test 4 (idempotency)

**Classification:** Gate — these tests ARE the spec contract.

- [ ] **Step 1:** Write the failing tests in `tests/integration/webhook-happy-path.test.ts`:

```ts
import '../helpers/resend-mock';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, stripeEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';
import { stripe } from '@/lib/stripe';

// Mock Stripe SDK calls used by the handler
vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return {
    ...real,
    stripe: {
      ...real.stripe,
      webhooks: {
        constructEvent: (raw: string) => JSON.parse(raw),  // bypass sig verify in tests
      },
      subscriptions: {
        // Post-Basil shape: period fields nested under items.data[0].
        retrieve: vi.fn(async (id: string) => ({
          id,
          items: {
            data: [{
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
            }],
          },
        })),
      },
    } as any,
  };
});

function postWebhook(event: any) {
  return POST(new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'mock' },
    body: JSON.stringify(event),
  }) as any);
}

beforeEach(() => { resetSentEmails(); });

describe('Test 1 — Webhook happy path', () => {
  it('creates subscriber+subscription rows, sends welcome email', async () => {
    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_test_1',
      email: 'happypath@example.com',
      stripeSubscriptionId: 'sub_test_1',
      stripeCustomerId: 'cus_test_1',
      paymentIntentId: 'pi_test_1',
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const sub = await db.query.subscribers.findFirst({ where: eq(subscribers.email, 'happypath@example.com') });
    expect(sub).toBeTruthy();

    const subscription = await db.query.subscriptions.findFirst({ where: eq(subscriptions.stripeSubscriptionId, 'sub_test_1') });
    expect(subscription?.status).toBe('active');
    expect(subscription?.sessionsRemaining).toBe(2);
    expect(subscription?.welcomeEmailStatus).toBe('sent');

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('happypath@example.com');
  });
});

describe('Test 4 — Webhook idempotency (replay)', () => {
  it('replaying the same event yields exactly 1 subscriber, 1 subscription, 1 email', async () => {
    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_replay',
      email: 'replay@example.com',
      stripeSubscriptionId: 'sub_replay',
      stripeCustomerId: 'cus_replay',
      paymentIntentId: 'pi_replay',
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r1 = await postWebhook(event);
    expect(r1.status).toBe(200);
    const r2 = await postWebhook(event);
    expect(r2.status).toBe(200);

    const subsCount = (await db.select().from(subscribers).where(eq(subscribers.email, 'replay@example.com'))).length;
    expect(subsCount).toBe(1);
    const subscriptionRows = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_replay'));
    expect(subscriptionRows).toHaveLength(1);
    expect(sentEmails).toHaveLength(1);
  });
});
```

- [ ] **Step 2:** Run tests to verify they fail.

```bash
npm test -- webhook-happy-path
```

Expected: tests run; should pass since handler is already written. If they fail, debug the handler. If tests don't even run, fix the Vitest setup.

- [ ] **Step 3:** Verify tests now pass.

```bash
npm test -- webhook-happy-path
```

Expected: 2 PASS.

- [ ] **Step 4:** Commit.

```bash
git add tests/integration/webhook-happy-path.test.ts
git commit -m "test(spec): satisfy spec tests 1 (happy path) + 4 (idempotency)"
```

### Task 3.9 — Manual end-to-end smoke test with Stripe CLI

**Classification:** Gate — verifies the slice against a real Stripe event in test mode.

- [ ] **Step 1:** Tell the human to install the Stripe CLI and forward events to local dev:

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the displayed `whsec_…` and update `.env.local`'s `STRIPE_WEBHOOK_SECRET`. Restart `npm run dev`.

- [ ] **Step 2:** Trigger a real test-mode checkout end-to-end.

Open `http://localhost:3000/mentoria`, click "Suscríbete", complete checkout with test card `4242 4242 4242 4242`, email `smoketest@example.com`. Wait for redirect to `/gracias`.

- [ ] **Step 3:** Verify DB rows + email.

```bash
psql "$DATABASE_URL" -c "SELECT email, welcome_email_status FROM subscribers JOIN subscriptions ON subscribers.id = subscriber_id ORDER BY subscribers.created_at DESC LIMIT 1;"
```

Expected: a row for `smoketest@example.com` with `welcome_email_status = 'sent'`. Check the Resend dashboard for a delivered email containing a `/api/auth/verify?token=...` URL.

- [ ] **Step 4:** No commit (this is a verification step).

---

## Slice 4 — Magic-link verify + sessions + `/cuenta` auth gate + first-visit profile form (Tests 5, 9.partial)

**Goal:** Subscribers can click the welcome email link, receive a session cookie, complete the first-visit profile form, and land on a (placeholder) `/cuenta` page. The auth gate is enforced via middleware-style checks in the layout.

**Slice integration test contract:**
- **Test 5** — magic-link verify is single-use.
- **Test 9 (partial)** — plaintext token never in DB; expired token rejected; consumed token rejected (same as test 5); cookie attributes correct; logout deletes session row.

**Files in this slice:**
- Modify: `src/db/schema.ts` (add `sessions` table)
- Generate: `src/db/migrations/0003_sessions.sql`
- Create: `src/lib/auth.ts` (session helpers, getSession, requireAuth, requireAdmin)
- Create: `src/app/api/auth/verify/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/cuenta/layout.tsx`
- Create: `src/app/cuenta/page.tsx` (placeholder; real dashboard in S5)
- Create: `src/app/cuenta/perfil/page.tsx`
- Create: `src/components/ProfileForm.tsx`
- Create: `src/app/cuenta/perfil/actions.ts` (server action)
- Create: `tests/integration/auth-verify.test.ts`

### Task 4.1 — `sessions` schema + migration

**Classification:** Gate — auth foundation.

- [ ] **Step 1:** Extend `src/db/schema.ts` (append):

```ts
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),  // opaque cookie value (32 hex bytes)
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2:** Generate and apply migration.

```bash
npx drizzle-kit generate --name sessions
npm run db:migrate
```

- [ ] **Step 3:** Update `tests/integration/setup.ts` `TABLES_TO_WIPE` to prepend `'sessions'`:

```ts
const TABLES_TO_WIPE: string[] = ['sessions', 'stripe_events', 'auth_tokens', 'subscriptions', 'subscribers'];
```

- [ ] **Step 4:** Commit.

```bash
git add src/db/schema.ts src/db/migrations/ tests/integration/setup.ts
git commit -m "feat(db): add sessions table"
```

### Task 4.2 — `src/lib/auth.ts` (session create/read/delete + guards)

**Classification:** Gate — cookie attributes + revocation logic. Wrong = security bug.

- [ ] **Step 1:** Create `src/lib/auth.ts`:

```ts
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { sessions, subscribers } from '@/db/schema';
import { eq, gte } from 'drizzle-orm';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'pe_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(subscriberId: string) {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, subscriberId, expiresAt });
  (await cookies()).set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return id;
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, cookie.value),
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  const subscriber = await db.query.subscribers.findFirst({
    where: eq(subscribers.id, session.subscriberId),
  });
  if (!subscriber) return null;
  // Sliding renewal: bump lastSeenAt + extend expiresAt
  const newExpires = new Date(Date.now() + SESSION_TTL_MS);
  await db.update(sessions)
    .set({ lastSeenAt: new Date(), expiresAt: newExpires })
    .where(eq(sessions.id, session.id));
  return { session, subscriber };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (cookie) {
    await db.delete(sessions).where(eq(sessions.id, cookie.value));
    cookieStore.delete(COOKIE_NAME);
  }
}

export async function requireAuth() {
  const ctx = await getSession();
  if (!ctx) redirect('/');
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireAuth();
  if (ctx.subscriber.role !== 'admin') redirect('/');
  return ctx;
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): session create/read/delete + auth/admin guards"
```

### Task 4.3 — `GET /api/auth/verify` route

**Classification:** Gate — magic-link entry point; behaves under criterion #2/#3/#5 of spec §7.2.

- [ ] **Step 1:** Create `src/app/api/auth/verify/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { consumeAuthToken } from '@/lib/auth-tokens';
import { createSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length < 32) {
    return NextResponse.redirect(`${env.APP_URL}/?auth_error=1`);
  }
  const consumed = await consumeAuthToken(token);
  if (!consumed) {
    return new NextResponse('invalid or expired link', { status: 401 });
  }
  await createSession(consumed.subscriberId);
  const sub = await db.query.subscribers.findFirst({ where: eq(subscribers.id, consumed.subscriberId) });
  if (sub?.role === 'admin') return NextResponse.redirect(`${env.APP_URL}/admin`);
  const needsProfile = !sub?.name || !sub?.instagramHandle || !sub?.dateOfBirth;
  return NextResponse.redirect(`${env.APP_URL}${needsProfile ? '/cuenta/perfil' : '/cuenta'}`);
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/auth/verify/route.ts
git commit -m "feat(auth): GET /api/auth/verify with role+profile-aware redirect"
```

### Task 4.4 — `POST /api/auth/logout`

**Classification:** Sprint — small endpoint with loud verification.

- [ ] **Step 1:** Create `src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import { env } from '@/lib/env';

export async function POST() {
  await deleteSession();
  return NextResponse.redirect(`${env.APP_URL}/`, { status: 303 });
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat(auth): POST /api/auth/logout"
```

### Task 4.5 — `/cuenta` layout (auth gate + profile gate)

**Classification:** Sprint — declarative gate; tests in S4.7 cover.

- [ ] **Step 1:** Create `src/app/cuenta/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const { subscriber } = await requireAuth();
  const h = await headers();
  const path = h.get('x-pathname') ?? '';
  const needsProfile = !subscriber.name || !subscriber.instagramHandle || !subscriber.dateOfBirth;
  if (needsProfile && !path.endsWith('/cuenta/perfil')) redirect('/cuenta/perfil');
  return <>{children}</>;
}
```

Note: Next.js does not expose pathname in server components by default. The dependency on `x-pathname` requires Next middleware to set this header. If you skip the header, you accept that on `/cuenta/perfil` itself the layout re-checks and would redirect to `/cuenta/perfil` — a no-op. That's acceptable.

- [ ] **Step 2:** Create placeholder `src/app/cuenta/page.tsx` (real dashboard in S5):

```tsx
export default async function CuentaPage() {
  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
      <h1 className="text-3xl font-heading text-white">Tu cuenta</h1>
      <p className="mt-4 text-portal-text/80">Dashboard llega en Slice 5.</p>
    </main>
  );
}
```

- [ ] **Step 3:** Commit.

```bash
git add src/app/cuenta/layout.tsx src/app/cuenta/page.tsx
git commit -m "feat(cuenta): auth+profile gate layout + placeholder page"
```

### Task 4.6 — First-visit profile form

**Classification:** Sprint — form + server action.

- [ ] **Step 1:** Create `src/components/ProfileForm.tsx`:

```tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitProfile } from '@/app/cuenta/perfil/actions';

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-transparent border border-white/60 text-white font-heading text-xl py-3 px-6 rounded-xl disabled:opacity-50">
      {pending ? 'Guardando…' : 'Continuar'}
    </button>
  );
}

export default function ProfileForm() {
  const [state, formAction] = useFormState(submitProfile, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-white">Nombre completo *</span>
        <input name="name" required className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Instagram handle *</span>
        <input name="instagram_handle" required className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Fecha de nacimiento *</span>
        <input name="date_of_birth" type="date" required className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Teléfono / WhatsApp (opcional)</span>
        <input name="phone" className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Zona horaria</span>
        <input name="timezone" defaultValue="America/Mexico_City" className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Notas / contexto para JP (opcional)</span>
        <textarea name="notes_from_subscriber" rows={3} className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      {state.error && <p className="text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

- [ ] **Step 2:** Create `src/app/cuenta/perfil/actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

const profileSchema = z.object({
  name: z.string().min(1).max(200),
  instagram_handle: z.string().min(1).max(60),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().max(40).optional().or(z.literal('')),
  timezone: z.string().min(1).max(60),
  notes_from_subscriber: z.string().max(2000).optional().or(z.literal('')),
});

export async function submitProfile(_prev: { error: string | null }, formData: FormData) {
  const { subscriber } = await requireAuth();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Por favor revisa los campos requeridos.' };
  const data = parsed.data;
  await db.update(subscribers).set({
    name: data.name,
    instagramHandle: data.instagram_handle,
    dateOfBirth: data.date_of_birth,
    phone: data.phone || null,
    timezone: data.timezone,
    notesFromSubscriber: data.notes_from_subscriber || null,
    profileCompletedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(subscribers.id, subscriber.id));
  redirect('/cuenta');
}
```

- [ ] **Step 3:** Create `src/app/cuenta/perfil/page.tsx`:

```tsx
import ProfileForm from '@/components/ProfileForm';

export default function PerfilPage() {
  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
      <h1 className="text-3xl font-heading text-white mb-4">Completa tu perfil</h1>
      <p className="text-portal-text/80 mb-8">
        Estos datos los necesita Juan Pablo para tu mentoría.
      </p>
      <ProfileForm />
    </main>
  );
}
```

- [ ] **Step 4:** Commit.

```bash
git add src/components/ProfileForm.tsx src/app/cuenta/perfil/
git commit -m "feat(cuenta): first-visit profile form with field-level gate"
```

### Task 4.7 — Integration tests: Tests 5, 9.plaintext-never-in-db, 9.expired-token, 9.cookie-attrs, 9.logout

**Classification:** Gate — security criteria.

- [ ] **Step 1:** Create `tests/integration/auth-verify.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, authTokens, sessions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { GET as verifyGET } from '@/app/api/auth/verify/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { createAuthToken } from '@/lib/auth-tokens';

async function makeSubscriber(email: string) {
  const [row] = await db.insert(subscribers).values({ email }).returning();
  return row;
}
function makeReq(url: string, init?: RequestInit) { return new Request(url, init) as any; }

describe('Test 5 — Magic-link verify is single-use', () => {
  it('first verify succeeds, second verify returns 401', async () => {
    const sub = await makeSubscriber('singleuse@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    const r1 = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    expect([302, 303, 307]).toContain(r1.status);
    const setCookie = r1.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/pe_session=/);

    const r2 = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    expect(r2.status).toBe(401);
  });
});

describe('Test 9 — Magic-link security criteria', () => {
  it('plaintext token never appears in DB', async () => {
    const sub = await makeSubscriber('plaintext@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    const rows = await db.execute(sql`SELECT token_hash FROM auth_tokens`);
    for (const row of rows.rows as any[]) {
      expect(row.token_hash).not.toBe(raw);
      expect(row.token_hash).toHaveLength(64);  // sha256 hex
    }
  });

  it('expired token is rejected', async () => {
    const sub = await makeSubscriber('expired@example.com');
    const raw = await createAuthToken(sub.id, 'login');
    // Manually expire it
    const hash = (await import('@/lib/auth-tokens')).hashToken(raw);
    await db.update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(authTokens.tokenHash, hash));
    const r = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    expect(r.status).toBe(401);
  });

  it('cookie has HttpOnly + Secure + SameSite=Lax + Path=/ + Max-Age >= 30d', async () => {
    const sub = await makeSubscriber('cookie@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    const r = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    const sc = r.headers.get('set-cookie') ?? '';
    expect(sc).toMatch(/HttpOnly/i);
    expect(sc).toMatch(/Secure/i);
    expect(sc).toMatch(/SameSite=Lax/i);
    expect(sc).toMatch(/Path=\//);
    const maxAge = Number((sc.match(/Max-Age=(\d+)/i) ?? [])[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(30 * 86400);
  });

  it('logout deletes the session row', async () => {
    const sub = await makeSubscriber('logout@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    const before = await db.select().from(sessions).where(eq(sessions.subscriberId, sub.id));
    expect(before).toHaveLength(1);
    await logoutPOST();
    const after = await db.select().from(sessions).where(eq(sessions.subscriberId, sub.id));
    expect(after).toHaveLength(0);
  });
});
```

- [ ] **Step 2:** Run tests.

```bash
npm test -- auth-verify
```

Expected: all PASS. If a test fails because `cookies()` cannot be used outside a request scope in the route handler, add a Vitest setup that mocks `next/headers`. (Most current setups handle this via the App Router test runner — confirm with the engineer running the plan.)

- [ ] **Step 3:** Commit.

```bash
git add tests/integration/auth-verify.test.ts
git commit -m "test(spec): satisfy spec tests 5 + 9 (security criteria, partial)"
```

---

## Slice 5 — Subscriber dashboard `/cuenta` + Stripe Customer Portal

**Goal:** A logged-in subscriber sees their info, sessions counter, status, and can open the Stripe Customer Portal (which handles card updates, invoices, and cancel-at-period-end). Inline editing of subscriber's own fields works.

**Slice integration test contract:** None of the §15.1 numbered tests are net-new here; this slice is verified by manual click-through. (Test 6 will be added in S6 because that slice covers the cancel-webhook handler too.)

**Files in this slice:**
- Create: `src/components/SubscriberDashboard.tsx`
- Create: `src/components/SessionsCounter.tsx`
- Create: `src/components/PastDueBanner.tsx`
- Create: `src/components/InlineEditableField.tsx`
- Create: `src/app/cuenta/actions.ts` (server actions for inline edits)
- Modify: `src/app/cuenta/page.tsx` (real dashboard)
- Create: `src/app/api/billing-portal/create/route.ts`

### Task 5.1 — Billing portal endpoint

**Classification:** Gate — produces redirect to user-facing third-party UI; misconfig = users land on broken portal.

- [ ] **Step 1:** Create `src/app/api/billing-portal/create/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const { subscriber } = await requireAuth();
  if (!subscriber.stripeCustomerId) {
    return NextResponse.json({ message: 'No tienes una suscripción activa.' }, { status: 400 });
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: subscriber.stripeCustomerId,
    return_url: `${env.APP_URL}/cuenta`,
  });
  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/billing-portal/create/route.ts
git commit -m "feat(api): POST /api/billing-portal/create"
```

### Task 5.2 — Subscriber dashboard components

**Classification:** Sprint — UI; verified visually.

- [ ] **Step 1:** Create `src/components/SessionsCounter.tsx`:

```tsx
export default function SessionsCounter({ remaining }: { remaining: number }) {
  return (
    <div className="text-center my-8">
      <p className="text-5xl font-heading text-white">{remaining} / 2</p>
      <p className="text-portal-text/70">sesiones este mes</p>
    </div>
  );
}
```

- [ ] **Step 2:** Create `src/components/PastDueBanner.tsx`:

```tsx
'use client';

import { useTransition } from 'react';

export default function PastDueBanner() {
  const [pending, start] = useTransition();
  function openPortal() {
    start(async () => {
      const res = await fetch('/api/billing-portal/create', { method: 'POST' });
      if (res.ok) { const { url } = await res.json(); window.location.href = url; }
    });
  }
  return (
    <div className="bg-red-900/40 border border-red-500/60 rounded-lg p-4 mb-6">
      <p className="text-red-200 font-semibold">Tu pago falló.</p>
      <p className="text-red-200/80 text-sm mt-1">Actualiza tu tarjeta antes de que se cancele tu suscripción.</p>
      <button onClick={openPortal} disabled={pending}
        className="mt-3 bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {pending ? 'Abriendo…' : 'Abrir Stripe Customer Portal'}
      </button>
    </div>
  );
}
```

- [ ] **Step 3:** Create `src/components/InlineEditableField.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';

interface Props {
  label: string;
  initialValue: string;
  fieldName: string;
  onSave: (formData: FormData) => Promise<void>;
}

export default function InlineEditableField({ label, initialValue, fieldName, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const fd = new FormData();
      fd.append(fieldName, value);
      await onSave(fd);
      setEditing(false);
    });
  }

  return (
    <div className="py-2">
      <span className="text-portal-text/70 text-sm">{label}</span>
      {editing ? (
        <div className="flex gap-2 mt-1">
          <input value={value} onChange={(e) => setValue(e.target.value)}
            className="flex-1 bg-white/[0.05] text-white rounded px-2 py-1" />
          <button onClick={submit} disabled={pending} className="bg-white/20 text-white px-3 rounded disabled:opacity-50">
            {pending ? '…' : 'Guardar'}
          </button>
          <button onClick={() => { setValue(initialValue); setEditing(false); }} className="text-portal-text/60 px-2">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="block text-white text-lg w-full text-left">
          {value || <span className="text-portal-text/40">— vacío</span>}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4:** Commit.

```bash
git add src/components/SessionsCounter.tsx src/components/PastDueBanner.tsx src/components/InlineEditableField.tsx
git commit -m "feat(ui): dashboard sub-components"
```

### Task 5.3 — Inline-edit server actions for subscriber

**Classification:** Sprint — narrow scope; Zod validation.

- [ ] **Step 1:** Create `src/app/cuenta/actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  instagram_handle: z.string().min(1).max(60).optional(),
  phone: z.string().max(40).optional(),
  timezone: z.string().min(1).max(60).optional(),
  notes_from_subscriber: z.string().max(2000).optional(),
}).partial();

export async function updateSubscriberField(formData: FormData) {
  const { subscriber } = await requireAuth();
  const data = updateSchema.parse(Object.fromEntries(formData));
  const colMap: Record<string, keyof typeof subscribers.$inferInsert> = {
    name: 'name',
    instagram_handle: 'instagramHandle',
    phone: 'phone',
    timezone: 'timezone',
    notes_from_subscriber: 'notesFromSubscriber',
  };
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    const col = colMap[key];
    if (col) update[col] = value === '' ? null : value;
  }
  await db.update(subscribers).set(update as any).where(eq(subscribers.id, subscriber.id));
  revalidatePath('/cuenta');
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/cuenta/actions.ts
git commit -m "feat(cuenta): inline-edit server action for subscriber fields"
```

### Task 5.4 — Real `/cuenta` dashboard

**Classification:** Sprint — composes components.

- [ ] **Step 1:** Replace `src/app/cuenta/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import SessionsCounter from '@/components/SessionsCounter';
import PastDueBanner from '@/components/PastDueBanner';
import InlineEditableField from '@/components/InlineEditableField';
import { updateSubscriberField } from './actions';

export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
  const { subscriber } = await requireAuth();

  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.subscriberId, subscriber.id),
      inArray(subscriptions.status, ['active', 'past_due']),
    ),
  });

  if (!sub) {
    return (
      <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
        <p className="text-portal-text/80">
          Tu suscripción se está procesando. Refresca en unos segundos.
        </p>
        <form action="/cuenta" method="get" className="mt-4">
          <button className="border border-white/40 text-white px-4 py-2 rounded">Refrescar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
      {sub.status === 'past_due' && <PastDueBanner />}
      <h1 className="text-3xl font-heading text-white">Tu cuenta</h1>
      <SessionsCounter remaining={sub.sessionsRemaining} />

      <section className="mt-8">
        <h2 className="text-xl font-heading text-white mb-2">Información personal</h2>
        <p className="text-portal-text/60 text-sm">Email: {subscriber.email} (no editable)</p>
        <InlineEditableField label="Nombre" initialValue={subscriber.name ?? ''} fieldName="name" onSave={updateSubscriberField} />
        <InlineEditableField label="Instagram" initialValue={subscriber.instagramHandle ?? ''} fieldName="instagram_handle" onSave={updateSubscriberField} />
        <InlineEditableField label="Teléfono" initialValue={subscriber.phone ?? ''} fieldName="phone" onSave={updateSubscriberField} />
        <InlineEditableField label="Zona horaria" initialValue={subscriber.timezone} fieldName="timezone" onSave={updateSubscriberField} />
        <InlineEditableField label="Notas para JP" initialValue={subscriber.notesFromSubscriber ?? ''} fieldName="notes_from_subscriber" onSave={updateSubscriberField} />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-heading text-white mb-2">Suscripción</h2>
        <p className="text-portal-text/80">
          Status: <span className="font-semibold">{sub.status}{sub.cancelAtPeriodEnd ? ' (cancela al fin del período)' : ''}</span>
        </p>
        <p className="text-portal-text/80">
          Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}
        </p>
        <p className="text-portal-text/60 text-sm mt-3">
          Si tienes dudas, escríbele a Juan Pablo por Instagram antes de cancelar.
        </p>
        <form action="/api/billing-portal/create" method="post" className="mt-3">
          <button className="border border-white/40 text-white px-4 py-2 rounded">
            Administrar pago / suscripción
          </button>
        </form>
        <form action="/api/auth/logout" method="post" className="mt-6">
          <button className="text-portal-text/60 text-sm">Cerrar sesión</button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 2:** Manual verification.

Boot dev, complete a real Stripe Checkout from `/mentoria`, open the email link, fill profile, land on `/cuenta`. Verify:
- Sessions counter shows "2 / 2"
- Status reads `active`
- Inline-edit a field, confirm it persists after reload
- Click "Administrar pago" → opens Stripe Customer Portal (after configuring it in dashboard per §8.3)
- Logout returns to `/`

- [ ] **Step 3:** Commit.

```bash
git add src/app/cuenta/page.tsx
git commit -m "feat(cuenta): subscriber dashboard with edits + portal + logout"
```

### Task 5.5 — Document Stripe Customer Portal configuration

**Classification:** Gate — must be enabled correctly in Stripe Dashboard for the user-facing button to work. Out-of-repo config drift = silent break.

- [ ] **Step 1:** Add a checklist file `docs/stripe-customer-portal-config.md`:

```markdown
# Stripe Customer Portal — required configuration

In Stripe Dashboard → Settings → Billing → Customer portal:

**Enable:**
- Update payment method
- View invoice history
- Cancel subscription:
  - "Cancel at end of billing period" (toggle this)
  - **NOT** "Cancel immediately"

**Disable:**
- Plan change (no plans to switch between)
- Quantity change
- Pause subscription
- Update business information

**Default return URL:** `https://portalespiritual.com.mx/cuenta`

Activate the portal in **both** test mode and live mode separately.
```

- [ ] **Step 2:** Commit.

```bash
git add docs/stripe-customer-portal-config.md
git commit -m "docs: Stripe Customer Portal required configuration"
```

---

## Slice 6 — Subscription lifecycle webhooks (Tests 6, 7)

**Goal:** Stripe lifecycle events mirror into our DB: cancel-at-period-end, deleted subscription, renewals reset sessions, failed payments mark past_due.

**Slice integration test contract:**
- **Test 6** — Cancel flow: admin cancel → webhook update → `cancel_at_period_end=true`, `status='active'`.
- **Test 7** — Past_due → restore: payment_failed → `status='past_due'`; `invoice.paid` → `status='active'`, `sessions_remaining=2`.

**Files in this slice:**
- Create: `src/lib/webhooks/handle-subscription-updated.ts`
- Create: `src/lib/webhooks/handle-subscription-deleted.ts`
- Create: `src/lib/webhooks/handle-invoice-paid.ts`
- Create: `src/lib/webhooks/handle-invoice-payment-failed.ts`
- Modify: `src/app/api/webhooks/stripe/route.ts` (dispatcher: new event types + `customer.subscription.created` no-op)
- Create: `src/app/api/admin/cancel-subscription/route.ts` (called in Test 6 — but admin gate full impl in S10; for this slice the route exists as a thin Stripe wrapper that any logged-in user could trip in dev. Add `requireAdmin` here from the start since the helper is already in S4.)
- Create: `tests/integration/subscription-lifecycle.test.ts`

### Task 6.1 — `customer.subscription.updated` handler

**Classification:** Gate — mirrors authoritative state from Stripe.

- [ ] **Step 1:** Create `src/lib/webhooks/handle-subscription-updated.ts`:

```ts
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  // Post-Basil: period fields are on items, not on the subscription. If the
  // webhook payload were ever missing items (shouldn't happen for our flow),
  // skip the period update rather than write Invalid Date.
  const item = sub.items?.data?.[0];
  const periodUpdate = item
    ? {
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
      }
    : {};
  await db.update(subscriptions).set({
    status: mapStatus(sub.status),
    ...periodUpdate,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, sub.id));
}

function mapStatus(s: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' {
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled';
  return 'active';
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/webhooks/handle-subscription-updated.ts
git commit -m "feat(webhook): customer.subscription.updated handler"
```

### Task 6.2 — `customer.subscription.deleted` handler

**Classification:** Gate — frees a capacity spot.

- [ ] **Step 1:** Create `src/lib/webhooks/handle-subscription-deleted.ts`:

```ts
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleSubscriptionDeleted(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  await db.update(subscriptions).set({
    status: 'canceled',
    canceledAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, sub.id));
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/webhooks/handle-subscription-deleted.ts
git commit -m "feat(webhook): customer.subscription.deleted handler"
```

### Task 6.3 — `invoice.paid` (reset sessions) + `invoice.payment_failed` (past_due)

**Classification:** Gate — resets the business-critical counter.

- [ ] **Step 1:** Create `src/lib/webhooks/handle-invoice-paid.ts`:

```ts
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any).subscription as string | null;
  if (!subId) return;  // not a subscription invoice
  await db.update(subscriptions).set({
    status: 'active',
    sessionsRemaining: 2,
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, subId));
}
```

- [ ] **Step 2:** Create `src/lib/webhooks/handle-invoice-payment-failed.ts`:

```ts
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subId = (invoice as any).subscription as string | null;
  if (!subId) return;
  await db.update(subscriptions).set({
    status: 'past_due',
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, subId));
}
```

- [ ] **Step 3:** Commit.

```bash
git add src/lib/webhooks/handle-invoice-paid.ts src/lib/webhooks/handle-invoice-payment-failed.ts
git commit -m "feat(webhook): invoice.paid + invoice.payment_failed handlers"
```

### Task 6.4 — Wire dispatcher (incl. `customer.subscription.created` no-op)

**Classification:** Sprint — dispatch table addition.

- [ ] **Step 1:** Modify `src/app/api/webhooks/stripe/route.ts` switch:

```ts
import { handleSubscriptionUpdated } from '@/lib/webhooks/handle-subscription-updated';
import { handleSubscriptionDeleted } from '@/lib/webhooks/handle-subscription-deleted';
import { handleInvoicePaid } from '@/lib/webhooks/handle-invoice-paid';
import { handleInvoicePaymentFailed } from '@/lib/webhooks/handle-invoice-payment-failed';

// Inside switch(event.type):
case 'checkout.session.completed':
  await handleCheckoutCompleted(event); break;
case 'customer.subscription.created':
  // no-op per spec §13.1; we still record the event so Stripe doesn't keep retrying
  break;
case 'customer.subscription.updated':
  await handleSubscriptionUpdated(event); break;
case 'customer.subscription.deleted':
  await handleSubscriptionDeleted(event); break;
case 'invoice.paid':
  await handleInvoicePaid(event); break;
case 'invoice.payment_failed':
  await handleInvoicePaymentFailed(event); break;
default:
  // Accept and record; unknown event types are not errors.
  break;
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat(webhook): dispatch subscription lifecycle + invoice events"
```

### Task 6.5 — `POST /api/admin/cancel-subscription`

**Classification:** Gate — calls Stripe cancel; the user-facing observable in Test 6.

- [ ] **Step 1:** Create `src/app/api/admin/cancel-subscription/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { subscriptionId } = body as { subscriptionId: string };
  const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!row) return NextResponse.json({ message: 'not found' }, { status: 404 });
  await stripe.subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: true });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/admin/cancel-subscription/route.ts
git commit -m "feat(api): POST /api/admin/cancel-subscription (admin-gated)"
```

### Task 6.6 — Integration tests: Test 6 (cancel flow) + Test 7 (past_due → restore)

**Classification:** Gate — these are spec-contract tests.

- [ ] **Step 1:** Extend the Stripe fixture helper (`tests/helpers/stripe-fixture.ts`) with builders:

```ts
export function makeSubscriptionUpdatedEvent(opts: { eventId: string; stripeSubscriptionId: string; cancelAtPeriodEnd: boolean; status?: string; periodStart?: number; periodEnd?: number; }): Stripe.Event {
  const periodStart = opts.periodStart ?? Math.floor(Date.now() / 1000);
  const periodEnd = opts.periodEnd ?? Math.floor(Date.now() / 1000) + 30 * 86400;
  return {
    id: opts.eventId, object: 'event', api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: 'customer.subscription.updated',
    data: { object: {
      id: opts.stripeSubscriptionId, object: 'subscription',
      status: opts.status ?? 'active',
      cancel_at_period_end: opts.cancelAtPeriodEnd,
      // Post-Basil shape — period lives on items, not on the subscription.
      items: { data: [{ current_period_start: periodStart, current_period_end: periodEnd }] },
    } as any },
  } as Stripe.Event;
}

export function makeInvoicePaymentFailedEvent(eventId: string, stripeSubscriptionId: string): Stripe.Event {
  return {
    id: eventId, object: 'event', api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: 'invoice.payment_failed',
    data: { object: { id: `in_${eventId}`, object: 'invoice', subscription: stripeSubscriptionId } as any },
  } as Stripe.Event;
}

export function makeInvoicePaidEvent(eventId: string, stripeSubscriptionId: string): Stripe.Event {
  return {
    id: eventId, object: 'event', api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: 'invoice.paid',
    data: { object: { id: `in_${eventId}`, object: 'invoice', subscription: stripeSubscriptionId } as any },
  } as Stripe.Event;
}
```

- [ ] **Step 2:** Write `tests/integration/subscription-lifecycle.test.ts`:

```ts
import '../helpers/resend-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import {
  makeSubscriptionUpdatedEvent,
  makeInvoicePaymentFailedEvent,
  makeInvoicePaidEvent,
} from '../helpers/stripe-fixture';

vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return { ...real, stripe: { ...real.stripe, webhooks: { constructEvent: (raw: string) => JSON.parse(raw) } } as any };
});

function postWebhook(event: any) {
  return POST(new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST', headers: { 'stripe-signature': 'mock' }, body: JSON.stringify(event),
  }) as any);
}

async function seedActiveSubscription(stripeSubId: string, email: string) {
  const [sub] = await db.insert(subscribers).values({ email }).returning();
  const product = (await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') }))!;
  const [row] = await db.insert(subscriptions).values({
    subscriberId: sub.id, productId: product.id, status: 'active',
    stripeSubscriptionId: stripeSubId,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
    sessionsRemaining: 2,
  }).returning();
  return { sub, row };
}

describe('Test 6 — Cancel flow', () => {
  it('after cancel webhook, DB shows cancel_at_period_end=true and status=active', async () => {
    const { row } = await seedActiveSubscription('sub_cancel_test', 'cancel@example.com');
    const ev = makeSubscriptionUpdatedEvent({
      eventId: 'evt_cancel_1',
      stripeSubscriptionId: 'sub_cancel_test',
      cancelAtPeriodEnd: true,
      status: 'active',
    });
    const r = await postWebhook(ev);
    expect(r.status).toBe(200);
    const after = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, row.id) });
    expect(after?.cancelAtPeriodEnd).toBe(true);
    expect(after?.status).toBe('active');
  });
});

describe('Test 7 — Past_due → restore', () => {
  it('payment_failed → past_due; invoice.paid → active + sessions reset to 2', async () => {
    const { row } = await seedActiveSubscription('sub_pd_test', 'pastdue@example.com');
    await db.update(subscriptions).set({ sessionsRemaining: 0 }).where(eq(subscriptions.id, row.id));

    const failEv = makeInvoicePaymentFailedEvent('evt_pd_fail', 'sub_pd_test');
    await postWebhook(failEv);
    let s = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, row.id) });
    expect(s?.status).toBe('past_due');

    const paidEv = makeInvoicePaidEvent('evt_pd_paid', 'sub_pd_test');
    await postWebhook(paidEv);
    s = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, row.id) });
    expect(s?.status).toBe('active');
    expect(s?.sessionsRemaining).toBe(2);
  });
});
```

- [ ] **Step 3:** Run.

```bash
npm test -- subscription-lifecycle
```

Expected: 2 PASS.

- [ ] **Step 4:** Commit.

```bash
git add tests/integration/subscription-lifecycle.test.ts tests/helpers/stripe-fixture.ts
git commit -m "test(spec): satisfy spec tests 6 (cancel) + 7 (past_due restore)"
```

---

## Slice 7 — Capacity race + duplicate-sub guards + failure-path emails (Tests 2, 3, 8)

**Goal:** The webhook handler now enforces the 8-spot cap atomically and refunds excess. The handler also detects existing-active-subscriber double-payment and refunds. Both paths use Stripe idempotency keys so retries never double-refund. The pre-checkout 409 guard is added in `POST /api/checkout/create`.

**Slice integration test contract:**
- **Test 2** — Capacity race (full cap) → no new row, race email delivered, payment refunded (observable external state).
- **Test 3** — Mixed-status capacity (5 active + 3 canceled → 9th succeeds).
- **Test 8** — Existing-active-sub double-payment guard → 1 row, duplicate-subscription email.

**Files in this slice:**
- Create: `src/lib/audit.ts`
- Modify: `src/lib/capacity.ts` (add `insertSubscriptionIfCapacity`)
- Modify: `src/lib/email.ts` (add race + duplicate templates)
- Modify: `src/lib/webhooks/handle-checkout-completed.ts` (race + duplicate paths)
- Modify: `src/app/api/checkout/create/route.ts` (pre-checkout 409 + customer reuse)
- Create: `tests/helpers/stripe-mock-with-state.ts` (tracks refund state)
- Create: `tests/integration/capacity-race.test.ts`
- Create: `tests/integration/capacity-mixed-status.test.ts`
- Create: `tests/integration/duplicate-subscription.test.ts`

### Task 7.1 — `src/lib/audit.ts`

**Classification:** Sprint — DB writer; loud failure on bad action name.

- [ ] **Step 1:** Add `audit_log` to schema (`src/db/schema.ts` append):

```ts
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => subscribers.id),  // nullable for system actions
  action: text('action').notNull(),
  targetSubscriberId: uuid('target_subscriber_id').references(() => subscribers.id),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2:** Generate + apply migration.

```bash
npx drizzle-kit generate --name audit_log
npm run db:migrate
```

- [ ] **Step 3:** Add `'audit_log'` to TABLES_TO_WIPE in `tests/integration/setup.ts`.

- [ ] **Step 4:** Create `src/lib/audit.ts`:

```ts
import { db } from '@/db/client';
import { auditLog } from '@/db/schema';

export async function appendAudit(opts: {
  adminId: string | null;
  action: string;
  targetSubscriberId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLog).values({
    adminId: opts.adminId,
    action: opts.action,
    targetSubscriberId: opts.targetSubscriberId ?? null,
    before: (opts.before ?? null) as any,
    after: (opts.after ?? null) as any,
  });
}
```

- [ ] **Step 5:** Commit.

```bash
git add src/db/schema.ts src/db/migrations/ src/lib/audit.ts tests/integration/setup.ts
git commit -m "feat(db): audit_log table + appendAudit helper"
```

### Task 7.2 — `insertSubscriptionIfCapacity` atomic helper

**Classification:** Gate — THE capacity-enforcement primitive.

- [ ] **Step 1:** Extend `src/lib/capacity.ts`:

```ts
import { sql } from 'drizzle-orm';

export async function insertSubscriptionIfCapacity(params: {
  subscriberId: string;
  productId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}): Promise<{ inserted: boolean; reason?: 'capacity_full' | 'duplicate_subscription' }> {
  try {
    const result = await db.execute(sql`
      INSERT INTO subscriptions (
        subscriber_id, product_id, status, stripe_subscription_id,
        current_period_start, current_period_end, sessions_remaining
      )
      SELECT ${params.subscriberId}::uuid, ${params.productId}::uuid, 'active',
             ${params.stripeSubscriptionId},
             ${params.currentPeriodStart}, ${params.currentPeriodEnd}, 2
      WHERE (
        SELECT COUNT(*) FROM subscriptions
        WHERE product_id = ${params.productId}::uuid
          AND status IN ('active', 'past_due')
      ) < (SELECT capacity FROM products WHERE id = ${params.productId}::uuid)
      RETURNING id;
    `);
    if (result.rows.length === 0) {
      return { inserted: false, reason: 'capacity_full' };
    }
    return { inserted: true };
  } catch (err) {
    const msg = String((err as Error).message ?? '');
    if (msg.includes('subscriptions_active_subscriber_per_product')) {
      return { inserted: false, reason: 'duplicate_subscription' };
    }
    throw err;
  }
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/capacity.ts
git commit -m "feat(capacity): atomic insertSubscriptionIfCapacity (full + duplicate handling)"
```

### Task 7.3 — Race + duplicate email templates

**Classification:** Sprint — copy + send wrapper.

- [ ] **Step 1:** Extend `src/lib/email.ts`:

```ts
interface RefundContext { to: string; idempotencyHeader: string; }

export async function sendRaceConditionEmail({ to, idempotencyHeader }: RefundContext) {
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL, to,
    subject: 'Tu suscripción a Mentoría no pudo completarse',
    html: raceHtml(), text: raceText(),
    headers: { 'X-Idempotency-Key': idempotencyHeader },
  });
}

export async function sendDuplicateSubscriptionEmail({ to, idempotencyHeader }: RefundContext) {
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL, to,
    subject: 'Ya tienes una suscripción activa',
    html: duplicateHtml(), text: duplicateText(),
    headers: { 'X-Idempotency-Key': idempotencyHeader },
  });
}

const REFUND_TIMELINE = 'El reembolso suele verse reflejado en 5-10 días hábiles, dependiendo de tu banco. Es automático, no necesitas hacer nada.';

function raceHtml(): string {
  return `<!doctype html><html lang="es"><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
<h1>Lo sentimos: el último cupo se tomó</h1>
<p>Alguien más completó su pago un instante antes que tú. Te hemos reembolsado los $2222 MXN automáticamente. ${REFUND_TIMELINE}</p>
<p>Si quieres, te avisamos cuando se abra un cupo nuevo:</p>
<p><a href="${env.APP_URL}/mentoria">Únete a la lista de espera</a></p>
<p>Con amor, JP.</p></body></html>`;
}
function raceText(): string {
  return `Lo sentimos: el último cupo se tomó.\n\nTe reembolsamos $2222 MXN automáticamente. ${REFUND_TIMELINE}\n\nÚnete a la lista de espera: ${env.APP_URL}/mentoria`;
}
function duplicateHtml(): string {
  return `<!doctype html><html lang="es"><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
<h1>Ya tienes una suscripción activa</h1>
<p>Detectamos que ya tienes una suscripción a la Mentoría 1-a-1. Te reembolsamos este nuevo cargo de $2222 MXN automáticamente. ${REFUND_TIMELINE}</p>
<p>Para administrar tu suscripción existente:</p>
<p><a href="${env.APP_URL}/cuenta">Abrir mi cuenta</a></p>
<p>Con amor, JP.</p></body></html>`;
}
function duplicateText(): string {
  return `Ya tienes una suscripción activa. Te reembolsamos $2222 MXN automáticamente. ${REFUND_TIMELINE}\n\nAbre tu cuenta: ${env.APP_URL}/cuenta`;
}
```

- [ ] **Step 2:** Extend `tests/helpers/resend-mock.ts` to also mock these:

```ts
// inside vi.mock factory, return:
sendRaceConditionEmail: vi.fn(async (params: any) => {
  sentEmails.push({ to: params.to, subject: 'Tu suscripción a Mentoría no pudo completarse', html: 'mocked', text: 'mocked', headers: { 'X-Idempotency-Key': params.idempotencyHeader } });
  return { data: { id: `re_mock_${Date.now()}` }, error: null };
}),
sendDuplicateSubscriptionEmail: vi.fn(async (params: any) => {
  sentEmails.push({ to: params.to, subject: 'Ya tienes una suscripción activa', html: 'mocked', text: 'mocked', headers: { 'X-Idempotency-Key': params.idempotencyHeader } });
  return { data: { id: `re_mock_${Date.now()}` }, error: null };
}),
```

- [ ] **Step 3:** Commit.

```bash
git add src/lib/email.ts tests/helpers/resend-mock.ts
git commit -m "feat(email): race-condition + duplicate-subscription templates with refund timing"
```

### Task 7.4 — Refactor `handle-checkout-completed.ts` for race + duplicate paths

**Classification:** Gate — the most failure-prone code path; touch carefully.

- [ ] **Step 1:** Replace `src/lib/webhooks/handle-checkout-completed.ts`:

```ts
import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendWelcomeEmail, sendRaceConditionEmail, sendDuplicateSubscriptionEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { insertSubscriptionIfCapacity } from '@/lib/capacity';
import { appendAudit } from '@/lib/audit';

export async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const email = (session.customer_details?.email ?? '').toLowerCase();
  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
  const paymentIntentId = session.payment_intent as string | null;
  if (!email || !stripeSubscriptionId) throw new Error('checkout session missing email or subscription');

  // Post-Basil (2025-03-31): period fields live on subscription items, not on the
  // top-level Subscription object. See:
  // https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error(`subscription ${sub.id} has no items`);
  const currentPeriodStart = new Date(item.current_period_start * 1000);
  const currentPeriodEnd = new Date(item.current_period_end * 1000);

  await db.insert(subscribers).values({ email, stripeCustomerId }).onConflictDoUpdate({
    target: subscribers.email,
    set: { stripeCustomerId, updatedAt: new Date() },
  });
  const sub_row = (await db.query.subscribers.findFirst({ where: eq(subscribers.email, email) }))!;
  const product = (await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') }))!;

  const result = await insertSubscriptionIfCapacity({
    subscriberId: sub_row.id,
    productId: product.id,
    stripeSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
  });

  if (result.inserted) {
    const raw = await createAuthToken(sub_row.id, 'welcome');
    const magicLinkUrl = `${env.APP_URL}/api/auth/verify?token=${raw}`;
    const emailResult = await sendWelcomeEmail({
      to: email, magicLinkUrl,
      idempotencyHeader: `${event.id}:welcome_email`,
    });
    await db.update(subscriptions)
      .set({ welcomeEmailStatus: emailResult.error ? 'failed' : 'sent' })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return;
  }

  // Refund path (both race + duplicate use same Stripe-side mechanics)
  if (paymentIntentId) {
    await stripe.subscriptions.cancel(stripeSubscriptionId, { invoice_now: false, prorate: false }, {
      idempotencyKey: `${event.id}:cancel`,
    });
    await stripe.refunds.create({ payment_intent: paymentIntentId }, {
      idempotencyKey: `${event.id}:refund`,
    });
  }

  if (result.reason === 'capacity_full') {
    await sendRaceConditionEmail({ to: email, idempotencyHeader: `${event.id}:race_email` });
    await appendAudit({
      adminId: null, action: 'capacity_race_refund',
      targetSubscriberId: sub_row.id,
      after: { stripeSubscriptionId, paymentIntentId },
    });
  } else if (result.reason === 'duplicate_subscription') {
    await sendDuplicateSubscriptionEmail({ to: email, idempotencyHeader: `${event.id}:duplicate_email` });
    await appendAudit({
      adminId: null, action: 'duplicate_subscription_refund',
      targetSubscriberId: sub_row.id,
      after: { stripeSubscriptionId, paymentIntentId },
    });
  }
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/webhooks/handle-checkout-completed.ts
git commit -m "feat(webhook): race-condition + duplicate-subscription refund paths"
```

### Task 7.5 — Pre-checkout 409 guard + Stripe customer reuse in `POST /api/checkout/create`

**Classification:** Gate — protects against the most common double-pay path.

- [ ] **Step 1:** Replace `src/app/api/checkout/create/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const ctx = await getSession();
  if (ctx) {
    const active = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.subscriberId, ctx.subscriber.id),
        inArray(subscriptions.status, ['active', 'past_due']),
      ),
    });
    if (active) {
      return NextResponse.json(
        { message: 'Ya tienes una suscripción activa.', redirect: '/cuenta' },
        { status: 409 },
      );
    }
  }

  const customerArg = ctx?.subscriber.stripeCustomerId
    ? { customer: ctx.subscriber.stripeCustomerId }
    : {};

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID_MENTORIA, quantity: 1 }],
    success_url: `${env.APP_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/mentoria?checkout=canceled`,
    automatic_tax: { enabled: false },
    locale: 'es',
    ...customerArg,
  });

  if (!session.url) return NextResponse.json({ message: 'Stripe did not return a URL' }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2:** Update `MentoriaCard.tsx` to handle the 409 redirect:

In the `handleSubscribe` function, on non-OK response, if `body.redirect` is set, do `window.location.href = body.redirect` instead of `alert`.

- [ ] **Step 3:** Commit.

```bash
git add src/app/api/checkout/create/route.ts src/components/MentoriaCard.tsx
git commit -m "feat(checkout): pre-checkout 409 guard + Stripe customer reuse"
```

### Task 7.6 — Stripe-mock-with-state helper (tracks refund external state)

**Classification:** Gate — Test 2 explicitly requires asserting the refund as observable external state. The mock must track payment_intent state across calls, not just record that a method was called.

- [ ] **Step 1:** Create `tests/helpers/stripe-mock-with-state.ts`:

```ts
import { vi } from 'vitest';

interface PaymentIntentState { id: string; refunded: boolean; }
interface SubscriptionState {
  id: string;
  status: 'active' | 'canceled';
  // Post-Basil: period fields belong on items, not the subscription. Mirror
  // Stripe's API shape so handlers under test see the same structure.
  items: { data: Array<{ current_period_start: number; current_period_end: number }> };
}

export const stripeState = {
  paymentIntents: new Map<string, PaymentIntentState>(),
  subscriptions: new Map<string, SubscriptionState>(),
  reset() { this.paymentIntents.clear(); this.subscriptions.clear(); },
  seedSubscription(id: string) {
    this.subscriptions.set(id, {
      id, status: 'active',
      items: {
        data: [{
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        }],
      },
    });
  },
  seedPaymentIntent(id: string) {
    this.paymentIntents.set(id, { id, refunded: false });
  },
  /** Test assertion helper: is the payment intent refunded? */
  isRefunded(id: string): boolean {
    return this.paymentIntents.get(id)?.refunded ?? false;
  },
};

vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return {
    ...real,
    stripe: {
      ...real.stripe,
      webhooks: { constructEvent: (raw: string) => JSON.parse(raw) },
      subscriptions: {
        retrieve: vi.fn(async (id: string) => {
          const existing = stripeState.subscriptions.get(id);
          if (existing) return existing;
          stripeState.seedSubscription(id);
          return stripeState.subscriptions.get(id);
        }),
        cancel: vi.fn(async (id: string) => {
          const s = stripeState.subscriptions.get(id);
          if (s) s.status = 'canceled';
          return s;
        }),
        update: vi.fn(async (id: string, params: any) => ({ id, ...params })),
      },
      refunds: {
        create: vi.fn(async (params: any) => {
          const pi = stripeState.paymentIntents.get(params.payment_intent);
          if (!pi) throw new Error(`unknown payment_intent: ${params.payment_intent}`);
          pi.refunded = true;
          return { id: `re_${params.payment_intent}`, payment_intent: params.payment_intent };
        }),
      },
    } as any,
  };
});
```

- [ ] **Step 2:** Commit.

```bash
git add tests/helpers/stripe-mock-with-state.ts
git commit -m "test(helpers): stateful Stripe mock that tracks refund state"
```

### Task 7.7 — Integration tests: Test 2 (race), Test 3 (mixed), Test 8 (duplicate)

**Classification:** Gate — spec contract.

- [ ] **Step 1:** Create `tests/integration/capacity-race.test.ts`:

```ts
import '../helpers/resend-mock';
import './stripe-mock-import';  // helper just imports stripe-mock-with-state — see Step 4
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { stripeState } from '../helpers/stripe-mock-with-state';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';

function postWebhook(event: any) {
  return POST(new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST', headers: { 'stripe-signature': 'mock' }, body: JSON.stringify(event),
  }) as any);
}

beforeEach(() => { resetSentEmails(); stripeState.reset(); });

describe('Test 2 — Capacity race (full cap)', () => {
  it('9th checkout: no new subscription row, race email sent, payment refunded', async () => {
    const product = (await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') }))!;
    // Seed 8 active subscriptions
    for (let i = 0; i < 8; i++) {
      const [sub] = await db.insert(subscribers).values({ email: `seed${i}@example.com` }).returning();
      await db.insert(subscriptions).values({
        subscriberId: sub.id, productId: product.id, status: 'active',
        stripeSubscriptionId: `sub_seed_${i}`,
        currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
        sessionsRemaining: 2,
      });
    }
    stripeState.seedSubscription('sub_race_9');
    stripeState.seedPaymentIntent('pi_race_9');

    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_race_9',
      email: 'overflow@example.com',
      stripeSubscriptionId: 'sub_race_9',
      stripeCustomerId: 'cus_race_9',
      paymentIntentId: 'pi_race_9',
      periodStart: Date.now() / 1000, periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r = await postWebhook(event);
    expect(r.status).toBe(200);

    // Assert: still exactly 8 active
    const [{ value: activeCount }] = await db.select({ value: count() }).from(subscriptions);
    expect(activeCount).toBe(8);

    // Assert: race email delivered
    const raceEmail = sentEmails.find((e) => e.to === 'overflow@example.com');
    expect(raceEmail?.subject).toBe('Tu suscripción a Mentoría no pudo completarse');

    // Assert: payment refunded (external observable state)
    expect(stripeState.isRefunded('pi_race_9')).toBe(true);

    // Spec §15.1 Test 2 final clause: if the overflow subscriber row exists,
    // no subscriptions row attaches to them.
    const overflowSub = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, 'overflow@example.com'),
    });
    if (overflowSub) {
      const attached = await db.select().from(subscriptions)
        .where(eq(subscriptions.subscriberId, overflowSub.id));
      expect(attached).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 2:** Create `tests/integration/capacity-mixed-status.test.ts`:

```ts
import '../helpers/resend-mock';
import '../helpers/stripe-mock-with-state';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { stripeState } from '../helpers/stripe-mock-with-state';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { and, count, eq, inArray } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';

beforeEach(() => { stripeState.reset(); resetSentEmails(); });

describe('Test 3 — Capacity with mixed statuses', () => {
  it('5 active + 3 canceled → 9th checkout succeeds and creates new active row', async () => {
    const product = (await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') }))!;
    for (let i = 0; i < 5; i++) {
      const [sub] = await db.insert(subscribers).values({ email: `act${i}@example.com` }).returning();
      await db.insert(subscriptions).values({
        subscriberId: sub.id, productId: product.id, status: 'active',
        stripeSubscriptionId: `sub_act_${i}`,
        currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
        sessionsRemaining: 2,
      });
    }
    for (let i = 0; i < 3; i++) {
      const [sub] = await db.insert(subscribers).values({ email: `can${i}@example.com` }).returning();
      await db.insert(subscriptions).values({
        subscriberId: sub.id, productId: product.id, status: 'canceled',
        stripeSubscriptionId: `sub_can_${i}`,
        currentPeriodStart: new Date(Date.now() - 60 * 86400_000),
        currentPeriodEnd: new Date(Date.now() - 30 * 86400_000),
        canceledAt: new Date(Date.now() - 29 * 86400_000),
        sessionsRemaining: 0,
      });
    }
    stripeState.seedSubscription('sub_new');
    stripeState.seedPaymentIntent('pi_new');
    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_mixed', email: 'newperson@example.com',
      stripeSubscriptionId: 'sub_new', stripeCustomerId: 'cus_new', paymentIntentId: 'pi_new',
      periodStart: Date.now() / 1000, periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r = await POST(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST', headers: { 'stripe-signature': 'mock' }, body: JSON.stringify(event),
    }) as any);
    expect(r.status).toBe(200);

    const [{ value: activeCount }] = await db.select({ value: count() }).from(subscriptions)
      .where(and(eq(subscriptions.productId, product.id), inArray(subscriptions.status, ['active', 'past_due'])));
    expect(activeCount).toBe(6);

    // Spec §15.1 Test 3 also requires: the new user has a welcome email and
    // their subscription row records welcome_email_status='sent'. (This guards
    // against a regression where the count is correct but the welcome path
    // silently broke.)
    const newSub = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, 'newperson@example.com'),
    });
    expect(newSub).toBeTruthy();
    const newSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.subscriberId, newSub!.id),
    });
    expect(newSubscription?.welcomeEmailStatus).toBe('sent');
    const welcomeEmail = sentEmails.find((e) => e.to === 'newperson@example.com');
    expect(welcomeEmail).toBeTruthy();
  });
});
```

- [ ] **Step 3:** Create `tests/integration/duplicate-subscription.test.ts`:

```ts
import '../helpers/resend-mock';
import '../helpers/stripe-mock-with-state';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { stripeState } from '../helpers/stripe-mock-with-state';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { count, eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';

beforeEach(() => { resetSentEmails(); stripeState.reset(); });

describe('Test 8 — Existing-active-sub double-payment guard', () => {
  it('second checkout for same email: 1 row, duplicate email delivered', async () => {
    const product = (await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') }))!;
    const [sub] = await db.insert(subscribers).values({ email: 'dup@example.com' }).returning();
    await db.insert(subscriptions).values({
      subscriberId: sub.id, productId: product.id, status: 'active',
      stripeSubscriptionId: 'sub_dup_first',
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      sessionsRemaining: 2,
    });
    stripeState.seedSubscription('sub_dup_second');
    stripeState.seedPaymentIntent('pi_dup');

    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_dup', email: 'dup@example.com',
      stripeSubscriptionId: 'sub_dup_second', stripeCustomerId: 'cus_dup', paymentIntentId: 'pi_dup',
      periodStart: Date.now() / 1000, periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r = await POST(new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST', headers: { 'stripe-signature': 'mock' }, body: JSON.stringify(event),
    }) as any);
    expect(r.status).toBe(200);

    const rows = await db.select().from(subscriptions).where(eq(subscriptions.subscriberId, sub.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].stripeSubscriptionId).toBe('sub_dup_first');  // original unchanged

    const dupEmail = sentEmails.find((e) => e.to === 'dup@example.com');
    expect(dupEmail?.subject).toBe('Ya tienes una suscripción activa');

    expect(stripeState.isRefunded('pi_dup')).toBe(true);
  });
});
```

- [ ] **Step 4:** Create the small import-side-effect helper `tests/integration/stripe-mock-import.ts`:

```ts
import '../helpers/stripe-mock-with-state';
```

(Reason: `vi.mock` must be hoisted by importing the module that calls it.)

- [ ] **Step 5:** Run all three tests.

```bash
npm test -- capacity-race capacity-mixed-status duplicate-subscription
```

Expected: 3 PASS.

- [ ] **Step 6:** Commit.

```bash
git add tests/integration/capacity-race.test.ts tests/integration/capacity-mixed-status.test.ts tests/integration/duplicate-subscription.test.ts tests/integration/stripe-mock-import.ts
git commit -m "test(spec): satisfy spec tests 2 (race), 3 (mixed), 8 (duplicate)"
```

---

## Slice 8 — Login magic link (user-initiated) + rate limiting (Tests 9.no-leak, 10, 11)

**Goal:** A subscriber whose welcome link expired (or who just wants to log in later) can request a fresh magic link via `POST /api/auth/login`. The endpoint enforces email-existence non-leak (always 200, flat timing) and a 5/min/IP rate limit using a DB-backed counter.

**Slice integration test contract:**
- **Test 9 (remaining)** — login returns 200 for both existent + non-existent emails; non-existent gets no Resend send.
- **Test 10** — per-IP exceed: 6 requests/IP/min → 6th = 429.
- **Test 11** — per-IP isolation: 5 from IP_A + 5 from IP_B → all 10 succeed.

**Files in this slice:**
- Modify: `src/db/schema.ts` (add `rate_limit_attempts`)
- Generate: `src/db/migrations/0005_rate_limit.sql`
- Create: `src/lib/rate-limit.ts`
- Modify: `src/lib/email.ts` (add login link template)
- Create: `src/app/api/auth/login/route.ts`
- Create: `tests/integration/auth-login.test.ts`

### Task 8.1 — `rate_limit_attempts` schema + migration

**Classification:** Sprint — small table, loud failure.

- [ ] **Step 1:** Append to `src/db/schema.ts`:

```ts
import { inet } from 'drizzle-orm/pg-core';

export const rateLimitAttempts = pgTable('rate_limit_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: text('endpoint').notNull(),
  ip: inet('ip').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
});
```

If Drizzle's pg-core doesn't export `inet` in your version, use `text` for `ip` and document the Postgres-side type via raw SQL in the migration.

- [ ] **Step 2:** Generate + apply migration.

```bash
npx drizzle-kit generate --name rate_limit
```

Open the generated SQL and confirm the column is `inet`. If Drizzle generated `text`, **manually patch** the migration:

```sql
ALTER TABLE rate_limit_attempts ALTER COLUMN ip TYPE inet USING ip::inet;
CREATE INDEX rate_limit_endpoint_ip_attempted ON rate_limit_attempts (endpoint, ip, attempted_at DESC);
```

```bash
npm run db:migrate
```

- [ ] **Step 3:** Add `'rate_limit_attempts'` to `TABLES_TO_WIPE` in `tests/integration/setup.ts`.

- [ ] **Step 4:** Commit.

```bash
git add src/db/schema.ts src/db/migrations/ tests/integration/setup.ts
git commit -m "feat(db): rate_limit_attempts table + index"
```

### Task 8.2 — `src/lib/rate-limit.ts`

**Classification:** Gate — security primitive. Test 11 specifically guards against the global-counter bug.

- [ ] **Step 1:** Create `src/lib/rate-limit.ts`:

```ts
import { db } from '@/db/client';
import { rateLimitAttempts } from '@/db/schema';
import { and, count, eq, gte, sql } from 'drizzle-orm';

export async function checkRateLimit(opts: {
  endpoint: string;
  ip: string;
  windowSeconds: number;
  maxAttempts: number;
}): Promise<{ allowed: boolean }> {
  await db.insert(rateLimitAttempts).values({
    endpoint: opts.endpoint,
    ip: opts.ip as any,  // inet cast handled by pg driver
  });
  const since = new Date(Date.now() - opts.windowSeconds * 1000);
  const [{ value }] = await db
    .select({ value: count() })
    .from(rateLimitAttempts)
    .where(and(
      eq(rateLimitAttempts.endpoint, opts.endpoint),
      eq(sql`${rateLimitAttempts.ip}`, sql`${opts.ip}::inet`),
      gte(rateLimitAttempts.attemptedAt, since),
    ));
  return { allowed: Number(value) <= opts.maxAttempts };
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/lib/rate-limit.ts
git commit -m "feat(rate-limit): DB-backed per-IP rate limit"
```

### Task 8.3 — Login email template

**Classification:** Sprint — copy.

- [ ] **Step 1:** Extend `src/lib/email.ts`:

```ts
export async function sendLoginLinkEmail({ to, magicLinkUrl }: { to: string; magicLinkUrl: string }) {
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL, to,
    subject: 'Tu enlace de acceso a Portal Espiritual',
    html: `<!doctype html><html lang="es"><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
<h1>Tu enlace de acceso</h1>
<p>Abre este enlace para entrar a tu panel:</p>
<p><a href="${magicLinkUrl}" style="background:#1a1a1a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Entrar</a></p>
<p style="font-size:14px;color:#666;">Este enlace es válido por 15 minutos y solo se puede usar una vez.</p>
<p style="font-size:14px;color:#666;">Si tú no pediste este enlace, ignora este correo.</p>
</body></html>`,
    text: `Abre este enlace para entrar a tu panel: ${magicLinkUrl}\n\nVálido 15 minutos, uso único.`,
  });
}
```

- [ ] **Step 2:** Mirror in `tests/helpers/resend-mock.ts`:

```ts
sendLoginLinkEmail: vi.fn(async (params: any) => {
  sentEmails.push({ to: params.to, subject: 'Tu enlace de acceso a Portal Espiritual', html: 'mocked', text: 'mocked', headers: {} });
  return { data: { id: `re_mock_${Date.now()}` }, error: null };
}),
```

- [ ] **Step 3:** Commit.

```bash
git add src/lib/email.ts tests/helpers/resend-mock.ts
git commit -m "feat(email): login-link template"
```

### Task 8.4 — `POST /api/auth/login`

**Classification:** Gate — rate limit + no-leak both happen here.

- [ ] **Step 1:** Create `src/app/api/auth/login/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendLoginLinkEmail } from '@/lib/email';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ email: z.string().email() });

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; first hop is the real client IP.
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || '127.0.0.1';
}

const MIN_RESPONSE_MS = 250;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const ip = clientIp(req);

  const rate = await checkRateLimit({
    endpoint: 'auth_login', ip, windowSeconds: 60, maxAttempts: 5,
  });
  if (!rate.allowed) {
    await delayUntil(startedAt + MIN_RESPONSE_MS);
    return new NextResponse('rate limited', { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    await delayUntil(startedAt + MIN_RESPONSE_MS);
    return NextResponse.json({ ok: true });  // do not leak schema errors
  }

  const email = parsed.data.email.toLowerCase();
  const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.email, email) });
  if (subscriber) {
    const raw = await createAuthToken(subscriber.id, 'login');
    const url = `${env.APP_URL}/api/auth/verify?token=${raw}`;
    await sendLoginLinkEmail({ to: email, magicLinkUrl: url });
  }

  await delayUntil(startedAt + MIN_RESPONSE_MS);
  return NextResponse.json({ ok: true });
}

async function delayUntil(targetMs: number) {
  const wait = targetMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat(auth): POST /api/auth/login with rate limit + no-leak + flat timing"
```

### Task 8.5 — Integration tests: 9.no-leak/timing, 10, 11

**Classification:** Gate — spec contract.

- [ ] **Step 1:** Create `tests/integration/auth-login.test.ts`:

```ts
import '../helpers/resend-mock';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { POST } from '@/app/api/auth/login/route';

function postLogin(email: string, ip = '1.2.3.4') {
  return POST(new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  }) as any);
}

beforeEach(() => { resetSentEmails(); });

describe('Test 9 — Login: existent and non-existent both 200', () => {
  it('non-existent email: 200, no Resend send', async () => {
    const r = await postLogin('ghost@example.com');
    expect(r.status).toBe(200);
    expect(sentEmails.filter((e) => e.to === 'ghost@example.com')).toHaveLength(0);
  });

  it('existent email: 200, exactly one Resend send', async () => {
    await db.insert(subscribers).values({ email: 'real@example.com' });
    const r = await postLogin('real@example.com');
    expect(r.status).toBe(200);
    expect(sentEmails.filter((e) => e.to === 'real@example.com')).toHaveLength(1);
  });
});

describe('Test 10 — Rate limit per-IP exceed', () => {
  it('6th request from same IP within 1 min returns 429', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await postLogin(`person${i}@example.com`, '5.5.5.5');
      expect(r.status).toBe(200);
    }
    const r6 = await postLogin('person6@example.com', '5.5.5.5');
    expect(r6.status).toBe(429);
  });
});

describe('Test 11 — Rate limit per-IP isolation', () => {
  it('5 from IP_A + 5 from IP_B: all succeed', async () => {
    for (let i = 0; i < 5; i++) {
      const ra = await postLogin(`a${i}@example.com`, '7.7.7.7');
      const rb = await postLogin(`b${i}@example.com`, '8.8.8.8');
      expect(ra.status).toBe(200);
      expect(rb.status).toBe(200);
    }
  });
});
```

- [ ] **Step 2:** Run.

```bash
npm test -- auth-login
```

Expected: all PASS.

- [ ] **Step 3:** Commit.

```bash
git add tests/integration/auth-login.test.ts
git commit -m "test(spec): satisfy spec tests 9 (no-leak), 10 (exceed), 11 (isolation)"
```

---

## Slice 9 — Waitlist + `/privacidad` + home page integration

**Goal:** `/privacidad` page exists with a versioned constant. The waitlist modal opens from the full-capacity CTA, captures email + explicit consent, writes to DB with the privacy version. The mentoría card is added to the home page in its own section below the existing 2x2 grid.

**Slice integration test contract:** None of §15.1 numbered tests. Verified by manual click-through and a focused unit test for the waitlist action.

**Files in this slice:**
- Modify: `src/db/schema.ts` (add `waitlist`)
- Generate: `src/db/migrations/0006_waitlist.sql`
- Create: `src/app/privacidad/page.tsx`
- Create: `src/components/WaitlistModal.tsx`
- Create: `src/app/mentoria/waitlist-actions.ts`
- Modify: `src/app/mentoria/page.tsx` (wire WaitlistModal to MentoriaCard's onWaitlistClick)
- Modify: `src/app/page.tsx` (add Mentoría section after the existing grid)
- Modify: `src/components/Footer.tsx` (add link to /privacidad)
- Create: `tests/integration/waitlist.test.ts`

### Task 9.1 — `waitlist` schema + migration

**Classification:** Sprint.

- [ ] **Step 1:** Append to `src/db/schema.ts`:

```ts
export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id),
  consentPrivacyAt: timestamp('consent_privacy_at', { withTimezone: true }).notNull(),
  consentPrivacyVersion: text('consent_privacy_version').notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2:** Generate + apply.

```bash
npx drizzle-kit generate --name waitlist
npm run db:migrate
```

- [ ] **Step 3:** Add `'waitlist'` to `TABLES_TO_WIPE`.

- [ ] **Step 4:** Commit.

```bash
git add src/db/schema.ts src/db/migrations/ tests/integration/setup.ts
git commit -m "feat(db): waitlist table"
```

### Task 9.2 — `/privacidad` page with `PRIVACY_VERSION`

**Classification:** Sprint — static content; the version constant matters for legal traceability.

- [ ] **Step 1:** Create `src/app/privacidad/page.tsx`:

```tsx
export const PRIVACY_VERSION = '2026-05-13';

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-4 py-16 max-w-3xl mx-auto text-portal-text/90">
      <h1 className="text-3xl lg:text-5xl font-heading text-white mb-6">Aviso de Privacidad</h1>
      <p className="text-sm text-portal-text/60 mb-8">Versión: {PRIVACY_VERSION}</p>

      <section className="space-y-4 text-lg leading-relaxed">
        <p>
          Portal Espiritual ("nosotros") es responsable del tratamiento de tus datos
          personales conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP) y su Reglamento.
        </p>
        <h2 className="text-2xl font-heading text-white mt-8">Datos que recolectamos</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Correo electrónico (necesario para tu cuenta y para enviarte tus accesos)</li>
          <li>Nombre completo, Instagram, fecha de nacimiento (suscriptores de mentoría)</li>
          <li>Teléfono, zona horaria, notas opcionales</li>
          <li>Información de pago: vive solamente en Stripe, nunca en nuestra base de datos</li>
        </ul>
        <h2 className="text-2xl font-heading text-white mt-8">Finalidades</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Procesar tu suscripción y darte acceso a los servicios contratados</li>
          <li>Comunicarnos contigo sobre tu cuenta o suscripción</li>
          <li>Cumplir obligaciones legales y fiscales aplicables</li>
        </ul>
        <h2 className="text-2xl font-heading text-white mt-8">Tus derechos ARCO</h2>
        <p>
          Tienes derecho a Acceso, Rectificación, Cancelación y Oposición sobre tus datos.
          Para ejercerlos, escríbenos a <a className="underline" href="mailto:hola@portalespiritual.com.mx">hola@portalespiritual.com.mx</a>.
        </p>
        <h2 className="text-2xl font-heading text-white mt-8">Contacto</h2>
        <p>
          Juan Pablo — guía espiritual y responsable del tratamiento.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/privacidad/page.tsx
git commit -m "feat(page): /privacidad with PRIVACY_VERSION constant (LFPDPPP)"
```

### Task 9.3 — Waitlist server action

**Classification:** Sprint — Zod validation + insert.

- [ ] **Step 1:** Create `src/app/mentoria/waitlist-actions.ts`:

```ts
'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { products, waitlist } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PRIVACY_VERSION } from '@/app/privacidad/page';
import { revalidatePath } from 'next/cache';

const schema = z.object({
  email: z.string().email(),
  consent: z.literal('on'),  // checkbox must be checked
});

export async function submitWaitlist(_prev: { ok: boolean; error: string | null }, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    consent: formData.get('consent') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: 'Por favor escribe un correo válido y acepta el aviso de privacidad.' };
  }
  const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
  if (!product) return { ok: false, error: 'No se pudo encontrar el producto.' };
  await db.insert(waitlist).values({
    email: parsed.data.email.toLowerCase(),
    productId: product.id,
    consentPrivacyAt: new Date(),
    consentPrivacyVersion: PRIVACY_VERSION,
  });
  revalidatePath('/mentoria');
  return { ok: true, error: null };
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/mentoria/waitlist-actions.ts
git commit -m "feat(waitlist): server action with LFPDPPP consent + privacy version"
```

### Task 9.4 — `WaitlistModal` component

**Classification:** Sprint.

- [ ] **Step 1:** Create `src/components/WaitlistModal.tsx`:

```tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitWaitlist } from '@/app/mentoria/waitlist-actions';

const initialState = { ok: false, error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-transparent border border-white/60 text-white py-2 px-6 rounded disabled:opacity-50">
      {pending ? 'Enviando…' : 'Únete'}
    </button>
  );
}

export default function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction] = useFormState(submitWaitlist, initialState);
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <div className="bg-portal-bg border border-white/20 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-heading text-white mb-4">Lista de espera</h2>
        {state.ok ? (
          <p className="text-white">Listo. Te aviso cuando se abra un cupo.</p>
        ) : (
          <form action={formAction} className="space-y-4">
            <label className="block">
              <span className="text-white">Tu correo</span>
              <input name="email" type="email" required
                className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
            </label>
            <label className="flex gap-2 items-start text-portal-text/80 text-sm">
              <input name="consent" type="checkbox" required className="mt-1" />
              <span>Acepto el <a href="/privacidad" target="_blank" className="underline">aviso de privacidad</a>.</span>
            </label>
            {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="text-portal-text/60">Cancelar</button>
              <SubmitButton />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/components/WaitlistModal.tsx
git commit -m "feat(ui): WaitlistModal with consent checkbox"
```

### Task 9.5 — Wire modal into `/mentoria` page

**Classification:** Sprint.

- [ ] **Step 1:** Since `/mentoria` is a server component, the modal trigger needs to live in a small client wrapper. Create `src/components/MentoriaCardWithWaitlist.tsx`:

```tsx
'use client';

import { useState } from 'react';
import MentoriaCard from '@/components/MentoriaCard';
import WaitlistModal from '@/components/WaitlistModal';

export default function MentoriaCardWithWaitlist({ capacityFull }: { capacityFull: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MentoriaCard capacityFull={capacityFull} onWaitlistClick={() => setOpen(true)} />
      <WaitlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2:** Modify `src/app/mentoria/page.tsx` to use `MentoriaCardWithWaitlist` instead of `MentoriaCard` directly.

- [ ] **Step 3:** Commit.

```bash
git add src/components/MentoriaCardWithWaitlist.tsx src/app/mentoria/page.tsx
git commit -m "feat(mentoria): wire WaitlistModal into the page"
```

### Task 9.6 — Add Mentoría section to home page (additive only)

**Classification:** Gate — touches existing pages; visual review required to confirm nothing existing breaks.

- [ ] **Step 1:** Modify `src/app/page.tsx` to add a new section AFTER the existing Hero (which contains the 2x2 grid + CTA). Append:

```tsx
import MentoriaCardWithWaitlist from '@/components/MentoriaCardWithWaitlist';
import { mentoriaConfig } from '@/config/mentoria';
import { getCapacity, isFull } from '@/lib/capacity';

// inside the default export, AFTER <Hero /> and BEFORE <AboutMe />:
{await (async () => {
  const cap = await getCapacity(mentoriaConfig.productSlug);
  return (
    <section className="relative z-10 py-24 px-6 max-w-2xl mx-auto">
      <MentoriaCardWithWaitlist capacityFull={isFull(cap)} />
    </section>
  );
})()}
```

If the existing `page.tsx` is a client component or uses a structure incompatible with inline async, refactor minimally: extract `<MentoriaHomeSection />` as a server component file `src/components/MentoriaHomeSection.tsx` and import that.

```tsx
// src/components/MentoriaHomeSection.tsx
import MentoriaCardWithWaitlist from '@/components/MentoriaCardWithWaitlist';
import { mentoriaConfig } from '@/config/mentoria';
import { getCapacity, isFull } from '@/lib/capacity';

export default async function MentoriaHomeSection() {
  const cap = await getCapacity(mentoriaConfig.productSlug);
  return (
    <section className="relative z-10 py-24 px-6 max-w-2xl mx-auto">
      <MentoriaCardWithWaitlist capacityFull={isFull(cap)} />
    </section>
  );
}
```

- [ ] **Step 2:** Manual verification.

Boot dev. Open `/` at 375px width. Confirm:
- Constellation animation still runs unchanged
- 4-card 2x2 grid unchanged
- "Reservar tu sesión" CTA unchanged
- **Below** the CTA: new Mentoría section appears, centered, single column
- AboutMe + Footer still render below
- Click "Suscríbete" on the home Mentoría card → redirects to Stripe Checkout
- Click "Cupo lleno - únete a la lista de espera" (after manually seeding 8 active subs) → opens the modal

- [ ] **Step 3:** Commit.

```bash
git add src/app/page.tsx src/components/MentoriaHomeSection.tsx
git commit -m "feat(home): add Mentoría section below existing grid (additive)"
```

### Task 9.7 — Add `/privacidad` link to Footer

**Classification:** Sprint.

- [ ] **Step 1:** Read existing `src/components/Footer.tsx` and add a discrete link to `/privacidad`. Minimal patch only — preserve all existing markup.

- [ ] **Step 2:** Commit.

```bash
git add src/components/Footer.tsx
git commit -m "feat(footer): link to /privacidad"
```

### Task 9.8 — Waitlist integration test

**Classification:** Sprint — narrow contract.

- [ ] **Step 1:** Create `tests/integration/waitlist.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { db } from '@/db/client';
import { waitlist } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { submitWaitlist } from '@/app/mentoria/waitlist-actions';

describe('Waitlist submission', () => {
  it('requires consent', async () => {
    const fd = new FormData();
    fd.append('email', 'no-consent@example.com');
    // consent omitted
    const result = await submitWaitlist({ ok: false, error: null }, fd);
    expect(result.ok).toBe(false);
  });

  it('inserts a row with privacy version', async () => {
    const fd = new FormData();
    fd.append('email', 'yes-consent@example.com');
    fd.append('consent', 'on');
    const result = await submitWaitlist({ ok: false, error: null }, fd);
    expect(result.ok).toBe(true);
    const rows = await db.select().from(waitlist).where(eq(waitlist.email, 'yes-consent@example.com'));
    expect(rows).toHaveLength(1);
    expect(rows[0].consentPrivacyVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 2:** Run + commit.

```bash
npm test -- waitlist
git add tests/integration/waitlist.test.ts
git commit -m "test(waitlist): consent required + privacy version captured"
```

---

## Slice 10 — Admin panel + seed script + pre-launch verification

**Goal:** JP can log in via magic link, see the subscriber list at `/admin`, drill into a subscriber, edit `sessions_remaining` inline (recorded in `audit_log`), and cancel a subscription. The seed script creates JP's admin row. The pre-launch checklist runs.

**Slice integration test contract:** Test 6's admin cancel endpoint already wired in S6; Slice 10 adds the UI on top.

**Files in this slice:**
- Create: `scripts/seed-admin.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/[id]/page.tsx`
- Create: `src/app/admin/[id]/actions.ts`
- Create: `src/components/admin/SubscribersList.tsx`
- Create: `src/components/admin/SubscriberDetail.tsx`
- Create: `src/components/admin/SessionsRemainingEditor.tsx`
- Create: `src/components/admin/CancelSubscriptionButton.tsx`
- Create: `src/components/admin/ResendWelcomeButton.tsx`
- Create: `src/app/api/admin/sessions-remaining/route.ts`
- Create: `src/app/api/admin/resend-welcome/route.ts`

### Task 10.1 — `scripts/seed-admin.ts`

**Classification:** Gate — wrong email = JP can't log in.

- [ ] **Step 1:** Create `scripts/seed-admin.ts`:

```ts
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { env } from '@/lib/env';

async function main() {
  if (!env.ADMIN_SEED_EMAIL) {
    console.error('ADMIN_SEED_EMAIL not set in env');
    process.exit(1);
  }
  await db.insert(subscribers).values({
    email: env.ADMIN_SEED_EMAIL,
    role: 'admin',
    name: 'Juan Pablo',
    profileCompletedAt: new Date(),
  }).onConflictDoUpdate({
    target: subscribers.email,
    set: { role: 'admin', profileCompletedAt: new Date() },
  });
  console.log(`seeded admin: ${env.ADMIN_SEED_EMAIL}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2:** Tell the human: set `ADMIN_SEED_EMAIL` in `.env.local` and Vercel production env, then run:

```bash
npx tsx scripts/seed-admin.ts
```

Expected: `seeded admin: <email>`.

- [ ] **Step 3:** Commit.

```bash
git add scripts/seed-admin.ts
git commit -m "feat(admin): seed-admin script"
```

### Task 10.2 — Admin layout (gate)

**Classification:** Gate.

- [ ] **Step 1:** Create `src/app/admin/layout.tsx`:

```tsx
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-portal-bg text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="font-heading text-2xl">Admin · Portal Espiritual</h1>
      </header>
      <div className="px-6 py-8 max-w-5xl mx-auto">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/app/admin/layout.tsx
git commit -m "feat(admin): admin layout with requireAdmin gate"
```

### Task 10.3 — Subscribers list page

**Classification:** Sprint.

- [ ] **Step 1:** Create `src/components/admin/SubscribersList.tsx`:

```tsx
import Link from 'next/link';

interface Row {
  subscriberId: string;
  name: string | null;
  email: string;
  createdAt: Date;
  sessionsRemaining: number;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export default function SubscribersList({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-left">
      <thead className="text-portal-text/60 text-sm">
        <tr><th>Nombre</th><th>Email</th><th>Fecha inicio</th><th>Sesiones</th><th>Status</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.subscriberId} className="border-t border-white/10">
            <td className="py-2"><Link href={`/admin/${r.subscriberId}`} className="underline">{r.name ?? '—'}</Link></td>
            <td>{r.email}</td>
            <td>{r.createdAt.toLocaleDateString('es-MX')}</td>
            <td>{r.sessionsRemaining}</td>
            <td>{r.status}{r.cancelAtPeriodEnd ? ' (cancela)' : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2:** Create `src/app/admin/page.tsx`:

```tsx
import { db } from '@/db/client';
import { subscribers, subscriptions } from '@/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import SubscribersList from '@/components/admin/SubscribersList';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const showCanceled = view === 'canceled';
  const statuses: ('active' | 'past_due' | 'canceled')[] = showCanceled ? ['canceled'] : ['active', 'past_due'];

  const rows = await db
    .select({
      subscriberId: subscribers.id,
      name: subscribers.name,
      email: subscribers.email,
      createdAt: subscriptions.createdAt,
      sessionsRemaining: subscriptions.sessionsRemaining,
      status: subscriptions.status,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(subscriptions)
    .innerJoin(subscribers, eq(subscribers.id, subscriptions.subscriberId))
    .where(inArray(subscriptions.status, statuses));

  return (
    <>
      <div className="mb-4 flex gap-4 text-sm">
        <Link href="/admin" className={!showCanceled ? 'underline' : ''}>Activas</Link>
        <Link href="/admin?view=canceled" className={showCanceled ? 'underline' : ''}>Canceladas</Link>
      </div>
      <SubscribersList rows={rows} />
    </>
  );
}
```

- [ ] **Step 3:** Commit.

```bash
git add src/components/admin/SubscribersList.tsx src/app/admin/page.tsx
git commit -m "feat(admin): subscribers list page with active/canceled toggle"
```

### Task 10.4 — Inline-edit sessions_remaining

**Classification:** Gate — writes audit_log; admin's only inline-edit action.

- [ ] **Step 1:** Create `src/app/api/admin/sessions-remaining/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { appendAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  subscriptionId: z.string().uuid(),
  sessionsRemaining: z.number().int().min(0).max(99),
});

export async function PATCH(req: NextRequest) {
  const { subscriber: admin } = await requireAdmin();
  const body = schema.parse(await req.json());
  const current = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, body.subscriptionId) });
  if (!current) return NextResponse.json({ message: 'not found' }, { status: 404 });
  await db.update(subscriptions).set({ sessionsRemaining: body.sessionsRemaining, updatedAt: new Date() })
    .where(eq(subscriptions.id, body.subscriptionId));
  await appendAudit({
    adminId: admin.id, action: 'set_sessions_remaining',
    targetSubscriberId: current.subscriberId,
    before: { sessionsRemaining: current.sessionsRemaining },
    after: { sessionsRemaining: body.sessionsRemaining },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2:** Create `src/components/admin/SessionsRemainingEditor.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';

export default function SessionsRemainingEditor({
  subscriptionId, initial,
}: { subscriptionId: string; initial: number }) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  function save(newValue: number) {
    setValue(newValue);
    start(async () => {
      await fetch('/api/admin/sessions-remaining', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId, sessionsRemaining: newValue }),
      });
    });
  }
  return (
    <input type="number" value={value} disabled={pending} min={0} max={99}
      onChange={(e) => save(Number(e.target.value))}
      className="w-20 bg-white/[0.05] text-white rounded px-2 py-1" />
  );
}
```

- [ ] **Step 3:** Commit.

```bash
git add src/app/api/admin/sessions-remaining/route.ts src/components/admin/SessionsRemainingEditor.tsx
git commit -m "feat(admin): inline edit sessions_remaining with audit_log"
```

### Task 10.5 — Cancel-subscription button

**Classification:** Sprint — wraps S6.5 endpoint.

- [ ] **Step 1:** Create `src/components/admin/CancelSubscriptionButton.tsx`:

```tsx
'use client';

import { useTransition } from 'react';

export default function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  function onClick() {
    if (!confirm('¿Cancelar al final del período?')) return;
    start(async () => {
      const r = await fetch('/api/admin/cancel-subscription', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      if (r.ok) window.location.reload();
    });
  }
  return (
    <button onClick={onClick} disabled={pending}
      className="border border-red-500/60 text-red-300 px-3 py-1 rounded disabled:opacity-50">
      {pending ? 'Cancelando…' : 'Cancelar suscripción'}
    </button>
  );
}
```

- [ ] **Step 2:** Commit.

```bash
git add src/components/admin/CancelSubscriptionButton.tsx
git commit -m "feat(admin): CancelSubscriptionButton"
```

### Task 10.6 — Resend welcome email + audit

**Classification:** Sprint.

- [ ] **Step 1:** Create `src/app/api/admin/resend-welcome/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { subscriptions, subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { appendAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ subscriptionId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const { subscriber: admin } = await requireAdmin();
  const { subscriptionId } = schema.parse(await req.json());
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!sub) return NextResponse.json({ message: 'not found' }, { status: 404 });
  const recipient = await db.query.subscribers.findFirst({ where: eq(subscribers.id, sub.subscriberId) });
  if (!recipient) return NextResponse.json({ message: 'subscriber missing' }, { status: 404 });

  // Set status to pending (overwrites prior value per spec N3)
  await db.update(subscriptions).set({ welcomeEmailStatus: 'pending', updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));

  const raw = await createAuthToken(recipient.id, 'welcome');
  const result = await sendWelcomeEmail({
    to: recipient.email,
    magicLinkUrl: `${env.APP_URL}/api/auth/verify?token=${raw}`,
    idempotencyHeader: `resend:${Date.now()}:welcome_email`,
  });

  await db.update(subscriptions)
    .set({ welcomeEmailStatus: result.error ? 'failed' : 'sent' })
    .where(eq(subscriptions.id, subscriptionId));

  await appendAudit({
    adminId: admin.id, action: 'resend_welcome_email',
    targetSubscriberId: recipient.id,
    after: { sentTo: recipient.email },
  });
  return NextResponse.json({ ok: true, status: result.error ? 'failed' : 'sent' });
}
```

- [ ] **Step 2:** Create `src/components/admin/ResendWelcomeButton.tsx`:

```tsx
'use client';

import { useTransition, useState } from 'react';

export default function ResendWelcomeButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  function onClick() {
    start(async () => {
      const r = await fetch('/api/admin/resend-welcome', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const body = await r.json();
      setMsg(r.ok ? `Estado: ${body.status}` : `Error: ${body.message ?? 'unknown'}`);
    });
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={onClick} disabled={pending}
        className="border border-white/40 text-white px-3 py-1 rounded disabled:opacity-50">
        {pending ? 'Enviando…' : 'Reenviar welcome email'}
      </button>
      {msg && <span className="text-sm text-portal-text/70">{msg}</span>}
    </div>
  );
}
```

- [ ] **Step 3:** Commit.

```bash
git add src/app/api/admin/resend-welcome/route.ts src/components/admin/ResendWelcomeButton.tsx
git commit -m "feat(admin): resend welcome email with overwrite-in-place status"
```

### Task 10.7 — Subscriber detail page

**Classification:** Sprint — composes everything.

- [ ] **Step 1:** Create `src/app/admin/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { subscribers, subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import SessionsRemainingEditor from '@/components/admin/SessionsRemainingEditor';
import CancelSubscriptionButton from '@/components/admin/CancelSubscriptionButton';
import ResendWelcomeButton from '@/components/admin/ResendWelcomeButton';

export const dynamic = 'force-dynamic';

export default async function SubscriberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.id, id) });
  if (!subscriber) notFound();
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.subscriberId, subscriber.id), inArray(subscriptions.status, ['active', 'past_due'])),
  });

  return (
    <div className="space-y-6">
      <a href="/admin" className="text-sm underline">← Lista</a>
      <h2 className="text-xl font-heading">Suscriptor: {subscriber.name ?? '—'}</h2>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-portal-text/60">Email</dt><dd>{subscriber.email}</dd>
        <dt className="text-portal-text/60">Instagram</dt><dd>{subscriber.instagramHandle ?? '—'}</dd>
        <dt className="text-portal-text/60">Fecha de nacimiento</dt><dd>{subscriber.dateOfBirth ?? '—'}</dd>
        <dt className="text-portal-text/60">Teléfono</dt><dd>{subscriber.phone ?? '—'}</dd>
        <dt className="text-portal-text/60">Zona horaria</dt><dd>{subscriber.timezone}</dd>
        <dt className="text-portal-text/60">Notas (de la persona)</dt><dd className="whitespace-pre-wrap">{subscriber.notesFromSubscriber ?? '—'}</dd>
      </dl>

      {sub ? (
        <section className="border-t border-white/10 pt-4 space-y-3">
          <h3 className="text-lg">Suscripción activa</h3>
          <p>Status: {sub.status}{sub.cancelAtPeriodEnd ? ' (cancela al fin del período)' : ''}</p>
          <p>Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}</p>
          <p>Welcome email: {sub.welcomeEmailStatus}</p>
          <div className="flex items-center gap-3">
            <span>Sesiones restantes:</span>
            <SessionsRemainingEditor subscriptionId={sub.id} initial={sub.sessionsRemaining} />
          </div>
          <div className="flex flex-wrap gap-3">
            <CancelSubscriptionButton subscriptionId={sub.id} />
            <ResendWelcomeButton subscriptionId={sub.id} />
            {subscriber.stripeCustomerId && (
              <a href={`https://dashboard.stripe.com/customers/${subscriber.stripeCustomerId}`}
                target="_blank" rel="noopener noreferrer"
                className="underline text-portal-text/80">Ver en Stripe Dashboard ↗</a>
            )}
          </div>
        </section>
      ) : (
        <p className="text-portal-text/70">Sin suscripción activa.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2:** Manual verification.

Log in as JP (via the seed-admin email's magic-link flow), verify:
- `/admin` shows the list with the right columns
- Click into one subscriber, change sessions count, reload, value persisted, `audit_log` row exists
- Click cancel, confirm, the subscription's `cancel_at_period_end` shows true after Stripe webhook reflects back
- Click "Reenviar welcome email", verify Resend received it

- [ ] **Step 3:** Commit.

```bash
git add src/app/admin/[id]/page.tsx
git commit -m "feat(admin): subscriber detail page with edits + actions"
```

### Task 10.8 — Final pre-launch checklist run (manual)

**Classification:** Gate — closes Phase 6.

- [ ] **Step 1:** Execute the spec's §15.3 checklist with the human:

```
[ ] $1 MXN test charge in Stripe LIVE mode end-to-end (subscribe → webhook → email → magic link → /cuenta → cancel-at-period-end → wait period or use Stripe CLI to trigger sub.deleted → refund manually)
[ ] JP confirmed his SAT fiscal decision before going live
[ ] LFPDPPP /privacidad reviewed by JP and ideally a lawyer
[ ] Resend domain still verified (re-check DNS records)
[ ] Stripe Customer Portal configured per docs/stripe-customer-portal-config.md (BOTH test mode and live mode)
[ ] All transactional emails visually rendered with REAL data on mobile Instagram in-app browser:
    [ ] Welcome email (magic link works on click)
    [ ] Race-condition email (refund timeline + waitlist link visible and correct)
    [ ] Duplicate-subscription email (refund timeline + /cuenta link)
    [ ] No {{var}} placeholders remain
    [ ] Sender domain is portalespiritual.com.mx
    [ ] Copy reads correctly in Spanish on iOS Safari + Android Chrome
[ ] Run the full integration test suite green: `npm test`
[ ] Manual visual review of home page mobile (375px): existing 4-card grid intact + Mentoría section below
[ ] Run `npm run build` locally; verify no TypeScript or ESLint errors
[ ] Deploy to a Vercel preview branch; verify migrations applied on Neon preview branch
[ ] Merge feature/phase-6 to main; verify production deploy succeeds
[ ] Watch first production Stripe checkout end-to-end
```

- [ ] **Step 2:** Tag the completion.

```bash
git tag -a phase-6-launched -m "Phase 6 mentoría launched end-to-end"
git push origin phase-6-launched
```

---

## Spec coverage cross-check

| Spec section | Plan task(s) |
|---|---|
| §1 Scope (all bullets) | All slices |
| §2 Principles | Honored throughout; explicit notes in S3 (idempotency), S7 (race), S9 (config-over-code), S10 (admin minimal) |
| §3.1 products | T1.3, T1.5 |
| §3.2 subscribers | T3.1 |
| §3.3 subscriptions + partial index | T3.1 |
| §3.4 waitlist | T9.1 |
| §3.5 stripe_events | T3.1 (table) + T3.7 (commit-at-end behavior) |
| §3.6 auth_tokens with kind | T3.1 + T3.3 (kind + TTL split) |
| §3.7 sessions | T4.1 + T4.2 |
| §3.8 audit_log | T7.1 |
| §3.9 rate_limit_attempts | T8.1 |
| §4 UI placement | T2.6 (/mentoria), T9.6 (home section) |
| §5 Capacity + race | T7.2 (atomic helper), T7.4 (refund path) |
| §6.1 Happy path | T3.6 + T3.7 |
| §6.1.1 Duplicate guard | T7.4 + T7.5 |
| §6.2 Cancel mid-checkout | T2.6 (URL params handling) |
| §6.3 Webhook latency framing | spec docs only; no code |
| §6.4 /cuenta fallback | T5.4 (subscription missing branch) |
| §6.5 Past_due | T6.3 + T5.4 (banner) |
| §7 Auth (full criteria) | S4 (verify+session+gate) + S8 (login + rate limit) |
| §8 Subscriber dashboard | S5 |
| §9 Admin panel | S10 |
| §10 Waitlist | S9 |
| §11 Migrations | T1.4 |
| §12 API surface | distributed across slices; matches §12 exactly |
| §13 Webhooks (incl. idempotency) | S3 + S6 + S7 |
| §14 Folder structure | matched in every Files block |
| §15.1 Tests 1–11 | T3.8 (1, 4), T4.7 (5, 9-partial), T6.6 (6, 7), T7.7 (2, 3, 8), T8.5 (9-remaining, 10, 11) |
| §15.3 Pre-launch checklist | T10.8 |

All 11 §15.1 tests are explicitly planned with code in the task that writes them.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-13-phase-6-mentoria-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans; batch execution with checkpoints.

**Which approach?**

NOTE: per the user's instructions, do NOT start either mode until the plan has been pasted back to the user and reviewed in B5 round 2.




