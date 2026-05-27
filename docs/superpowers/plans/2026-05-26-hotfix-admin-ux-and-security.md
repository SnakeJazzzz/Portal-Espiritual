# Hotfix: Admin UX + Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 bugs surfaced by the LIVE production smoke before reverting price to $2,222 and tagging launch — (1) admin status display polish for cancel-at-period-end, (2) UUID validation on dynamic admin route, (3) UI refresh after admin actions.

**Architecture:** Three independent fixes on one branch (`hotfix/admin-ux-and-security`), one commit per bug. Bug 1 is the minimum visual surface — amber badge in `/admin` lista when canceling + "Acceso termina" line in `/admin/[id]` when canceling. No helper extraction (principle #7: don't rewrite features previas; existing inline ternaries stay). Bug 2 introduces a UUID validator used by the only dynamic admin route. Bug 3 adds optimistic DB writes in the cancel route + `router.refresh()` in the client buttons so the page reflects mutation results on the first click, without waiting for the Stripe webhook race. The optimistic write fails closed — Stripe OK + DB write failure returns 500 + audit_log entry + the client does not refresh (webhook compensates eventually, idempotent).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Drizzle ORM, zod, Vitest, Stripe SDK 17.

---

## Drift notes (read before starting)

Empirical verification before drafting (per CLAUDE.md backlog-hygiene rule):

- **`src/components/admin/SubscribersList.tsx:42` already renders** `" (cancela)"` when `cancelAtPeriodEnd=true`.
- **`src/app/admin/[id]/page.tsx:54` already renders** `" (cancela al fin del período)"` for the same case.

The smoke report stated "UI mostró 'active' puro" — most likely production was on a stale deploy at smoke-time (commit `acc64b9` "bare-minimum readability pass" landed May 25, and prior commits may not have included the inline ternary the user is now seeing in source). The text-only signal is already present in HEAD.

What this plan therefore treats as Bug 1 scope (amended — minimum surface, per user direction):
1. **Visual badge differentiation** (amber pill) for `active+cancelAtPeriodEnd=true` in `/admin` lista — currently it's plain text, JP cannot scan at a glance.
2. **"Acceso termina: DD/MM/YYYY"** line in `/admin/[id]` when canceling — currently always reads "Próximo cobro" regardless.

Explicitly OUT of scope for this hotfix:
- DRY refactor / helper extraction. The inline `(cancela)` / `(cancela al fin del período)` ternaries in HEAD stay as-is. Principle #7 ("no reescribir features previas para soportar futuras"): if Phase 7/8 needs the helper in more surfaces, extract it then with real context.
- Modifying `/cuenta` — it already shows the correct string + correct "Acceso termina" label.
- Modifying admin lista's plain-text rendering of non-canceling rows.

Only dynamic route in the App Router: `src/app/admin/[id]/page.tsx` (verified via `find src/app -type d -name '[*]'`). Bug 2 fix is therefore scoped to exactly that one route + the lib helper. Auth verify uses `?token=` query string, not a `[token]` segment, so it's unaffected.

`zod` is already in the stack; UUID validation goes through `z.string().uuid().safeParse(value).success` (cheaper than rolling a custom regex and matches the pattern already used in `src/app/api/admin/*/route.ts`).

---

## File Structure

**New files:**
- `src/lib/uuid.ts` — pure helper, `isValidUuid(value: string): boolean`
- `tests/unit/uuid.test.ts` — unit tests for UUID validation helper
- `tests/integration/admin-detail-uuid-validation.test.ts` — integration test that `/admin/[id]` handler short-circuits to `notFound()` on non-UUID and renders normally for valid UUIDs
- `tests/integration/admin-cancel-optimistic-db.test.ts` — integration test that the cancel route writes `cancelAtPeriodEnd=true` to DB optimistically after Stripe success, and returns 500 + leaves DB untouched if the DB update fails post-Stripe

**Modified files:**
- `src/components/admin/SubscribersList.tsx` — wrap the `(cancela)` text in an amber pill `<span>` when `cancelAtPeriodEnd=true`; non-canceling rows untouched
- `src/app/admin/[id]/page.tsx` — add UUID short-circuit before any DB query; add "Acceso termina: DD/MM/YYYY" line shown instead of "Próximo cobro" when `cancelAtPeriodEnd=true`
- `src/components/admin/CancelSubscriptionButton.tsx` — replace `window.location.reload()` with `router.refresh()`; only refresh on `r.ok`
- `src/components/admin/ResendWelcomeButton.tsx` — add `router.refresh()` after fetch success
- `src/components/admin/SessionsRemainingEditor.tsx` — add `router.refresh()` after fetch success
- `src/app/api/admin/cancel-subscription/route.ts` — write `cancelAtPeriodEnd=true` to DB optimistically after Stripe success; on DB-write failure return 500 + `appendAudit` entry + propagate error message; webhook compensates eventually (idempotent)

**Explicitly NOT modified in this hotfix:**
- `src/app/admin/page.tsx` — no schema changes to the lista query (badge needs only `cancelAtPeriodEnd`, already in select)
- `src/app/cuenta/page.tsx` — already renders the correct strings
- No new shared display helper (`subscription-display.ts`) — out of scope by user direction

**Tests folder note:** `tests/unit/` doesn't exist yet; create it. Vitest config (`vitest.config.ts`) includes `tests/**/*.test.ts`, so new unit tests are auto-picked-up. The integration setup file `tests/integration/setup.ts` is wired via `setupFiles` globally and runs `beforeAll` regardless of suite, so `ALLOW_DESTRUCTIVE_TESTS=true` must be set even when running unit-only tests. Existing constraint, not new.

---

## Branch + base setup (one-time, before Task 1)

- [ ] **Step 0.1: Verify clean working tree on main**

```bash
git status
git log -1 --oneline
```

Expected: clean tree, HEAD at `585e4b0` (or newer if main moved).

- [ ] **Step 0.2: Create hotfix branch**

```bash
git checkout -b hotfix/admin-ux-and-security
```

Expected: switched to a new branch.

- [ ] **Step 0.3: Sanity check — tests green on baseline**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test 2>&1 | tail -20
```

Expected: all suites pass. If any fail on baseline, STOP and report — do not start fixes on a red baseline.

---

## Task 1: Bug 1 — Amber badge in lista + "Acceso termina" in detail (minimum surface)

**Files:**
- Modify: `src/components/admin/SubscribersList.tsx`
- Modify: `src/app/admin/[id]/page.tsx`

**Commit message at end of task:** `fix(admin): show cancel-at-period-end status in admin views`

No new tests in this task — both changes are pure JSX/styling on text that's already rendered. The current display logic (inline ternaries on `cancelAtPeriodEnd`) stays untouched. Visual verification happens in the user-owned PR smoke (see "Visual smoke ownership" section at the end).

---

- [ ] **Step 1.1: Add amber pill to `SubscribersList`**

Edit `src/components/admin/SubscribersList.tsx`. The current Status cell renders `{r.status}{r.cancelAtPeriodEnd ? ' (cancela)' : ''}` as plain text (line 41-42). Replace the Status `<td>` only — leave the rest of the file unchanged:

Find this block:
```tsx
            <td className="py-3 pr-3">
              {r.status}
              {r.cancelAtPeriodEnd ? ' (cancela)' : ''}
            </td>
```

Replace with:
```tsx
            <td className="py-3 pr-3">
              {r.cancelAtPeriodEnd ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/40 px-2 py-0.5 text-sm">
                  {r.status} (cancela)
                </span>
              ) : (
                r.status
              )}
            </td>
```

Rationale: the badge fires off `cancelAtPeriodEnd` only, matching the existing ternary's trigger. Non-canceling rows render exactly the same plain text as before (zero visual regression).

- [ ] **Step 1.2: Add "Acceso termina" line in `/admin/[id]`**

Edit `src/app/admin/[id]/page.tsx`. Currently `Próximo cobro` is always rendered (line 56). Replace just the `Próximo cobro` paragraph — keep Status, Welcome email, and everything else as-is:

Find this block:
```tsx
          <p>
            Status: {sub.status}
            {sub.cancelAtPeriodEnd ? ' (cancela al fin del período)' : ''}
          </p>
          <p>Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}</p>
```

Replace with:
```tsx
          <p>
            Status: {sub.status}
            {sub.cancelAtPeriodEnd ? ' (cancela al fin del período)' : ''}
          </p>
          {sub.cancelAtPeriodEnd ? (
            <p>Acceso termina: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}</p>
          ) : (
            <p>Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}</p>
          )}
```

Rationale: minimum diff. The Status text already has the `(cancela al fin del período)` suffix in HEAD; only the Próximo cobro / Acceso termina swap is the actual missing piece.

- [ ] **Step 1.3: tsc clean**

```bash
npx tsc --noEmit
```

Expected: exit 0, no errors.

- [ ] **Step 1.4: Full test suite green**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test 2>&1 | tail -10
```

Expected: all existing suites still pass (no test changes in this task, so this is a regression guard).

- [ ] **Step 1.5: Commit Bug 1**

```bash
git add src/components/admin/SubscribersList.tsx src/app/admin/[id]/page.tsx
git commit -m "fix(admin): show cancel-at-period-end status in admin views

Two minimum-surface visual changes on admin views when a sub is
canceling at period end:

1. /admin lista: wrap the existing '<status> (cancela)' text in an
   amber pill so JP can scan canceling subs at a glance.
2. /admin/[id]: render 'Acceso termina: DD/MM/YYYY' instead of
   'Próximo cobro: ...' when cancelAtPeriodEnd=true, matching the
   /cuenta behavior the subscriber already sees.

No helper extraction — existing inline ternaries kept (principle:
no reescribir features previas para soportar futuras).

Surfaced by 2026-05-26 LIVE smoke."
```

Run `git log -1` to verify the commit landed.

---

## Task 2: Bug 2 — UUID validation on `/admin/[id]`

**Files:**
- Create: `src/lib/uuid.ts`
- Create: `tests/unit/uuid.test.ts`
- Create: `tests/integration/admin-detail-uuid-validation.test.ts`
- Modify: `src/app/admin/[id]/page.tsx`

**Commit message at end of task:** `fix(security): validate UUID params before db queries`

---

- [ ] **Step 2.1: Write failing unit tests for the UUID helper**

Create `tests/unit/uuid.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isValidUuid } from '@/lib/uuid';

describe('isValidUuid', () => {
  it('accepts a canonical UUID v4', () => {
    expect(isValidUuid('a3bb189e-8bf9-4d8c-9f1a-1234567890ab')).toBe(true);
  });

  it('accepts a UUID with uppercase hex', () => {
    expect(isValidUuid('A3BB189E-8BF9-4D8C-9F1A-1234567890AB')).toBe(true);
  });

  it('rejects the empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('rejects the path-traversal probe ".env"', () => {
    expect(isValidUuid('.env')).toBe(false);
  });

  it('rejects "../etc/passwd" style probes', () => {
    expect(isValidUuid('../etc/passwd')).toBe(false);
  });

  it('rejects numeric-only input', () => {
    expect(isValidUuid('123')).toBe(false);
  });

  it('rejects UUID with extra trailing chars', () => {
    expect(isValidUuid('a3bb189e-8bf9-4d8c-9f1a-1234567890ab.env')).toBe(false);
  });

  it('rejects UUID with whitespace', () => {
    expect(isValidUuid(' a3bb189e-8bf9-4d8c-9f1a-1234567890ab ')).toBe(false);
  });

  // Defensive runtime checks: the TypeScript signature is (value: string), so null/undefined
  // shouldn't reach the function under TS-clean code paths. But Next.js dynamic params come
  // from the URL and could in principle be coerced if upstream changes; the helper should not
  // throw on these inputs (return false). The casts here exist only because the test is
  // exercising runtime defensiveness against a contract the type system already enforces.
  it('rejects null defensively without throwing', () => {
    expect(() => isValidUuid(null as unknown as string)).not.toThrow();
    expect(isValidUuid(null as unknown as string)).toBe(false);
  });

  it('rejects undefined defensively without throwing', () => {
    expect(() => isValidUuid(undefined as unknown as string)).not.toThrow();
    expect(isValidUuid(undefined as unknown as string)).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run unit test and confirm failure**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test -- tests/unit/uuid.test.ts
```

Expected: FAIL with `Cannot find module '@/lib/uuid'`.

- [ ] **Step 2.3: Implement the UUID helper**

Create `src/lib/uuid.ts`:

```typescript
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export function isValidUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}
```

- [ ] **Step 2.4: Confirm unit test passes**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test -- tests/unit/uuid.test.ts
```

Expected: all 8 cases pass.

- [ ] **Step 2.5: Write failing integration test for the route's notFound short-circuit + valid-UUID happy path + no-stderr-noise**

Create `tests/integration/admin-detail-uuid-validation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';

vi.mock('@/lib/auth', async () => {
  const real = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...real,
    requireAdmin: vi.fn(async () => ({ subscriber: { id: 'admin_id', role: 'admin' } })),
  };
});

// Spy on `notFound` — Next's helper throws a special error that the framework
// converts to a 404. Asserting the throw is sufficient at unit level.
import { notFound } from 'next/navigation';
vi.mock('next/navigation', async () => {
  const real = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...real,
    notFound: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),
  };
});

import SubscriberDetail from '@/app/admin/[id]/page';

describe('Admin detail — UUID validation', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    (notFound as ReturnType<typeof vi.fn>).mockClear();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stderrSpy.mockRestore();
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_uuid_test'));
    await db.delete(subscribers).where(eq(subscribers.email, 'adminuuid@example.com'));
  });

  it('calls notFound when id is ".env" (no postgres error, no stderr noise)', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '.env' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();

    // Critical: validate that the route did NOT log the postgres '22P02' invalid-uuid
    // error to stderr (which is what happened before the guard was added).
    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrCalls).not.toContain('22P02');
    expect(stderrCalls).not.toContain('invalid input syntax for type uuid');
  });

  it('calls notFound when id is "../etc/passwd"', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '../etc/passwd' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound when id is "123"', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '123' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound when id is empty string', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('renders normally with a valid UUID that maps to a real subscriber (no notFound)', async () => {
    // Seed: real subscriber + real subscription, so the route can complete its render.
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');
    await db.insert(subscribers).values({
      email: 'adminuuid@example.com',
      stripeCustomerId: 'cus_admin_uuid',
    });
    const subscriber = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, 'adminuuid@example.com'),
    });
    if (!subscriber) throw new Error('subscriber seed failed');
    const now = new Date();
    await db.insert(subscriptions).values({
      subscriberId: subscriber.id,
      productId: product.id,
      status: 'active',
      stripeSubscriptionId: 'sub_admin_uuid_test',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86400 * 1000),
      sessionsRemaining: 2,
    });

    const result = await SubscriberDetail({
      params: Promise.resolve({ id: subscriber.id }),
    });
    // React server component returns a JSX element — non-null/undefined proves the page ran to completion.
    expect(result).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('calls notFound when id is a valid UUID format but no subscriber exists (db path reached, second notFound site fires)', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: 'a3bb189e-8bf9-4d8c-9f1a-1234567890ab' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
    // Crucially: no postgres '22P02' here either — the UUID format is valid, query just returned 0 rows.
    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrCalls).not.toContain('22P02');
  });
});
```

- [ ] **Step 2.6: Run integration test and confirm failure**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test -- tests/integration/admin-detail-uuid-validation.test.ts
```

Expected: the first three cases FAIL because the route currently passes `.env` straight to Drizzle, which throws postgres `22P02` instead of calling `notFound()`. The fourth case may also fail or succeed depending on DB state; either way it's not the assertion that matters here — what matters is that the first three throw `22P02` until the guard is added.

If postgres error wording differs from `22P02`, that's OK — the test asserts the symptom is `NEXT_NOT_FOUND`, so any other thrown error counts as a failure.

- [ ] **Step 2.7: Add the UUID guard to the route**

Edit `src/app/admin/[id]/page.tsx`. Add the import near the existing imports:

```typescript
import { isValidUuid } from '@/lib/uuid';
```

Then add the guard as the very first action after `const { id } = await params;`:

```typescript
const { id } = await params;
if (!isValidUuid(id)) notFound();
const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.id, id) });
```

- [ ] **Step 2.8: Confirm integration test now passes**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test -- tests/integration/admin-detail-uuid-validation.test.ts
```

Expected: all 4 cases pass.

- [ ] **Step 2.9: Run full test suite**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test 2>&1 | tail -10
```

Expected: all suites pass.

- [ ] **Step 2.10: tsc clean**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 2.11: Commit Bug 2**

```bash
git add src/lib/uuid.ts tests/unit/uuid.test.ts tests/integration/admin-detail-uuid-validation.test.ts src/app/admin/[id]/page.tsx
git commit -m "fix(security): validate UUID params before db queries

Bot scan of GET /admin/.env crashed the route handler with
postgres 22P02 (invalid UUID syntax) because the [id] param was
passed straight to Drizzle. Short-circuit to notFound() before
any DB call when the param is not a valid UUID.

Scoped to /admin/[id] — verified via 'find src/app -type d
-name [*]' that this is the only dynamic param route. Auth verify
uses query strings, not [token] segments, so it's unaffected.

Helper isValidUuid in src/lib/uuid.ts is the shared validator
for any future dynamic admin route.

Surfaced by 2026-05-26 LIVE smoke."
```

---

## Task 3: Bug 3 — UI refresh after admin actions

**Files:**
- Create: `tests/integration/admin-cancel-optimistic-db.test.ts`
- Modify: `src/app/api/admin/cancel-subscription/route.ts`
- Modify: `src/components/admin/CancelSubscriptionButton.tsx`
- Modify: `src/components/admin/ResendWelcomeButton.tsx`
- Modify: `src/components/admin/SessionsRemainingEditor.tsx`

**Commit message at end of task:** `fix(admin): refresh UI after admin actions`

---

### Root cause recap

The cancel button calls `window.location.reload()` after the Stripe API succeeds. But the cancel route only calls Stripe — it leaves the DB row's `cancelAtPeriodEnd=false` until the webhook `customer.subscription.updated` arrives (which races the reload). Result: 2-click UX.

Fix has three parts:
1. **Optimistic DB write** in the cancel route after Stripe success — writes `cancelAtPeriodEnd=true`. The webhook stays idempotent (Stripe is still source of truth; the webhook will later overwrite with the same value, since `cancel_at_period_end:true` is what we just told Stripe).
2. **Fail-closed semantics**: if Stripe succeeds but the DB write fails, the route returns **500** with a user-facing Spanish message + writes an `audit_log` row with the stripeSubscriptionId and the DB error. Client does **NOT** call `router.refresh()` on non-2xx — it surfaces an alert to JP. The webhook compensates eventually because Stripe was already told to cancel.
3. **`router.refresh()`** on the client — gentler than `window.location.reload()`, re-runs server components and shows fresh DB-derived data on the first click. Apply to all 3 admin buttons. Only fires when `r.ok` is true.

`window.location.reload()` is replaced (not augmented) because `router.refresh()` does exactly what we want — invalidates the server-component cache for the current route and re-fetches data.

---

- [ ] **Step 3.1: Write failing integration tests for optimistic DB write + DB-failure fallback + webhook idempotency**

Create `tests/integration/admin-cancel-optimistic-db.test.ts`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

const { stripeUpdate } = vi.hoisted(() => ({
  stripeUpdate: vi.fn(async () => ({ id: 'sub_admin_cancel_optimistic', cancel_at_period_end: true })),
}));

vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial Stripe SDK mock; full type would require restating dozens of methods
  return { ...real, stripe: { ...real.stripe, subscriptions: { update: stripeUpdate } } as any };
});

vi.mock('@/lib/auth', async () => {
  const real = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return { ...real, requireAdmin: vi.fn(async () => ({ subscriber: { id: 'admin_id', role: 'admin' } })) };
});

import { POST } from '@/app/api/admin/cancel-subscription/route';

// Helper to seed a subscriber + subscription for the cancel route to act on.
async function seed(opts: { email: string; stripeSubId: string; cancelAtPeriodEnd?: boolean }) {
  const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
  if (!product) throw new Error('mentoria product not seeded');
  await db.insert(subscribers).values({ email: opts.email, stripeCustomerId: `cus_${opts.stripeSubId}` });
  const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.email, opts.email) });
  if (!subscriber) throw new Error('subscriber seed failed');
  const now = new Date();
  await db.insert(subscriptions).values({
    subscriberId: subscriber.id,
    productId: product.id,
    status: 'active',
    stripeSubscriptionId: opts.stripeSubId,
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + 30 * 86400 * 1000),
    sessionsRemaining: 2,
    cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
  });
  const row = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, opts.stripeSubId),
  });
  if (!row) throw new Error('subscription seed failed');
  return { subscriber, row };
}

describe('Admin cancel — optimistic DB write', () => {
  afterEach(async () => {
    stripeUpdate.mockReset();
    stripeUpdate.mockImplementation(async () => ({ id: 'sub_admin_cancel_optimistic', cancel_at_period_end: true }));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_optimistic'));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_dbfail'));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_idempotent'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincanceloptim@example.com'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincanceldbfail@example.com'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincancelidem@example.com'));
  });

  it('sets cancelAtPeriodEnd=true on the DB row after Stripe success (no webhook needed)', async () => {
    const { row } = await seed({
      email: 'admincanceloptim@example.com',
      stripeSubId: 'sub_admin_cancel_optimistic',
    });

    const res = await POST(new Request('http://localhost/api/admin/cancel-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscriptionId: row.id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NextRequest cast for route handler in tests
    }) as any);

    expect(res.status).toBe(200);
    expect(stripeUpdate).toHaveBeenCalledWith('sub_admin_cancel_optimistic', { cancel_at_period_end: true });

    const updated = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_optimistic'),
    });
    expect(updated?.cancelAtPeriodEnd).toBe(true);
  });

  it('returns 500 + Spanish message + audit_log entry + leaves DB untouched when post-Stripe DB write fails', async () => {
    const { subscriber, row } = await seed({
      email: 'admincanceldbfail@example.com',
      stripeSubId: 'sub_admin_cancel_dbfail',
    });

    // Stripe succeeds.
    stripeUpdate.mockResolvedValueOnce({ id: 'sub_admin_cancel_dbfail', cancel_at_period_end: true });

    // Force the post-Stripe DB write to fail by spying on db.update once.
    const updateSpy = vi.spyOn(db, 'update').mockImplementationOnce(() => {
      throw new Error('simulated DB outage');
    });

    const res = await POST(new Request('http://localhost/api/admin/cancel-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscriptionId: row.id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toContain('Stripe');
    expect(body.message).toContain('panel');

    // DB row still shows the pre-Stripe state (cancelAtPeriodEnd=false), because the optimistic write was the call that failed.
    const stillFalse = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_dbfail'),
    });
    expect(stillFalse?.cancelAtPeriodEnd).toBe(false);

    // Audit log has the failure entry.
    updateSpy.mockRestore();
    const audits = await db.select().from(auditLog).where(eq(auditLog.targetSubscriberId, subscriber.id));
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[audits.length - 1].action).toBe('cancel_subscription_db_write_failed');
  });

  it('is idempotent — webhook arriving later with the same cancel_at_period_end=true value does not error and converges to the same DB state', async () => {
    const { row } = await seed({
      email: 'admincancelidem@example.com',
      stripeSubId: 'sub_admin_cancel_idempotent',
    });

    // First call: route applies optimistic write.
    await POST(new Request('http://localhost/api/admin/cancel-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscriptionId: row.id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const afterOptimistic = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_idempotent'),
    });
    expect(afterOptimistic?.cancelAtPeriodEnd).toBe(true);

    // Simulate the webhook overwriting with the same value (idempotent).
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, row.id));

    const afterWebhook = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_idempotent'),
    });
    expect(afterWebhook?.cancelAtPeriodEnd).toBe(true);
  });
});
```

- [ ] **Step 3.2: Run test and confirm failure**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test -- tests/integration/admin-cancel-optimistic-db.test.ts
```

Expected: FAIL — `updated?.cancelAtPeriodEnd` is `false`, route currently only calls Stripe.

- [ ] **Step 3.3: Add optimistic DB write + fail-closed semantics to the cancel route**

Edit `src/app/api/admin/cancel-subscription/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { appendAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { subscriber: admin } = await requireAdmin();
  const body = await req.json();
  const { subscriptionId } = body as { subscriptionId: string };
  const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!row) return NextResponse.json({ message: 'not found' }, { status: 404 });

  // Step A: tell Stripe. Stripe is the source of truth — if this throws, nothing happens locally.
  await stripe.subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: true });

  // Step B: optimistic local mirror. If this fails, the webhook will eventually
  // compensate (idempotent), but the UI won't reflect the cancel on the first
  // click. Surface a 500 with a Spanish message + audit_log entry so JP knows
  // to refresh manually in a few seconds.
  try {
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId));
  } catch (err) {
    const dbErrorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[admin-cancel] post-Stripe DB write failed for stripeSubscriptionId=${row.stripeSubscriptionId}: ${dbErrorMessage}\n`,
    );
    await appendAudit({
      adminId: admin.id,
      action: 'cancel_subscription_db_write_failed',
      targetSubscriberId: row.subscriberId,
      after: { stripeSubscriptionId: row.stripeSubscriptionId, dbError: dbErrorMessage },
    });
    return NextResponse.json(
      {
        message:
          'Suscripción cancelada en Stripe pero hubo un error al actualizar el panel. Se reflejará en unos segundos.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
```

The webhook `customer.subscription.updated` will fire moments later and overwrite this row — with the same value — so idempotency holds. Stripe stays the source of truth: the only path that decides whether a sub is canceling is "Stripe confirmed it"; we just don't wait around for the webhook to update the UI in the happy path, and we degrade gracefully when the optimistic write fails.

- [ ] **Step 3.4: Confirm new test passes + the existing admin-cancel test still passes**

```bash
ALLOW_DESTRUCTIVE_TESTS=true npm test -- tests/integration/admin-cancel-optimistic-db.test.ts tests/integration/admin-cancel.test.ts
```

Expected: both suites green.

- [ ] **Step 3.5: Swap `window.location.reload()` for `router.refresh()` in CancelSubscriptionButton + surface 500 to JP**

Edit `src/components/admin/CancelSubscriptionButton.tsx`:

```tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm('¿Cancelar al final del período?')) return;
    start(async () => {
      const r = await fetch('/api/admin/cancel-subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      if (r.ok) {
        router.refresh();
        return;
      }
      // Surface backend message so JP knows the Stripe-OK / DB-fail case.
      let message = 'Error al cancelar la suscripción.';
      try {
        const body = await r.json();
        if (typeof body?.message === 'string') message = body.message;
      } catch {
        // fall through to default message
      }
      alert(message);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="border border-red-500/60 text-red-300 px-3 py-1 rounded disabled:opacity-50"
    >
      {pending ? 'Cancelando…' : 'Cancelar suscripción'}
    </button>
  );
}
```

The `alert()` is intentional (simple, blocking, accessible) — this is admin UI for JP, not a customer surface. No router.refresh on error: the DB might be stale, but the webhook will compensate within seconds and a manual reload then shows truth.

- [ ] **Step 3.6: Add `router.refresh()` to ResendWelcomeButton**

Edit `src/components/admin/ResendWelcomeButton.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ResendWelcomeButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function onClick() {
    start(async () => {
      const r = await fetch('/api/admin/resend-welcome', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const body = await r.json();
      setMsg(r.ok ? `Estado: ${body.status}` : `Error: ${body.message ?? 'unknown'}`);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="border border-white/40 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Reenviar welcome email'}
      </button>
      {msg && <span className="text-sm text-portal-text/70">{msg}</span>}
    </div>
  );
}
```

- [ ] **Step 3.7: Add `router.refresh()` to SessionsRemainingEditor**

Edit `src/components/admin/SessionsRemainingEditor.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionsRemainingEditor({
  subscriptionId,
  initial,
}: {
  subscriptionId: string;
  initial: number;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save(newValue: number) {
    setValue(newValue);
    start(async () => {
      const r = await fetch('/api/admin/sessions-remaining', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId, sessionsRemaining: newValue }),
      });
      if (r.ok) router.refresh();
    });
  }

  return (
    <input
      type="number"
      value={value}
      disabled={pending}
      min={0}
      max={99}
      onChange={(e) => save(Number(e.target.value))}
      className="w-20 bg-white/[0.05] text-white rounded px-2 py-1"
    />
  );
}
```

- [ ] **Step 3.8: tsc clean + full test suite**

```bash
npx tsc --noEmit && ALLOW_DESTRUCTIVE_TESTS=true npm test 2>&1 | tail -10
```

Expected: tsc exit 0, all suites pass.

- [ ] **Step 3.9: Commit Bug 3**

```bash
git add src/app/api/admin/cancel-subscription/route.ts tests/integration/admin-cancel-optimistic-db.test.ts src/components/admin/CancelSubscriptionButton.tsx src/components/admin/ResendWelcomeButton.tsx src/components/admin/SessionsRemainingEditor.tsx
git commit -m "fix(admin): refresh UI after admin actions

Cancel button required 2 clicks because cancel-subscription only
called Stripe and waited for the customer.subscription.updated
webhook to flip cancelAtPeriodEnd in DB. Now the route writes
the same value to DB optimistically after Stripe succeeds —
webhook stays idempotent (will overwrite with the same value).

Client buttons now use router.refresh() instead of
window.location.reload() (cancel) or no refresh at all (resend
welcome, sessions remaining), so server components re-render
with fresh DB-derived data on the first click.

Surfaced by 2026-05-26 LIVE smoke."
```

---

## Final verification (after all 3 commits)

- [ ] **Step F.1: tsc, lint, tests, build all green**

```bash
npx tsc --noEmit
npm run lint
ALLOW_DESTRUCTIVE_TESTS=true npm test 2>&1 | tail -10
npm run build 2>&1 | tail -20
```

All four must succeed cleanly. If `npm run build` fails on something unrelated to this hotfix, STOP and report — don't paper over baseline issues in this branch.

- [ ] **Step F.2: Branch state**

```bash
git log main..HEAD --oneline
```

Expected: exactly 3 commits, in this order:
```
<sha3> fix(admin): refresh UI after admin actions
<sha2> fix(security): validate UUID params before db queries
<sha1> fix(admin): show cancel-at-period-end status in admin views
```

- [ ] **Step F.3: Push branch (do NOT merge to main yet — user opens PR)**

```bash
git push -u origin hotfix/admin-ux-and-security
```

Stop here. The user will open the PR, review, and merge.

---

## Visual smoke ownership (post-execution, owned by developer)

Visual smoke is **not** an automated step in this plan. The developer (user) owns it on the Vercel preview deploy that PR `hotfix/admin-ux-and-security` produces, before merging to `main`.

**PR description must include this test plan checklist verbatim** (copy/paste into the GitHub PR body so JP / reviewers can re-run it):

```markdown
## Test plan (manual smoke on preview deploy)

Run these against the Vercel preview URL the PR generates, mobile viewport (375px in Instagram in-app browser if possible).

- [ ] a) Cancel desde /admin/[id] → UI se actualiza sin segundo click
      (status row shows amber pill "active (cancela al fin del período)" and "Acceso termina: DD/MM/YYYY" instead of "Próximo cobro")
- [ ] b) Cambiar sessions-remaining → reflejo inmediato
      (after change, hard-reload the page; DB-persisted value matches what you entered)
- [ ] c) Resend welcome email → feedback visual inmediato
      ("Estado: sent" appears AND the "Welcome email:" line above updates from "pending" to "sent")
- [ ] d) GET /admin/.env → renderiza 404 limpio sin error en logs
      (use Vercel runtime logs to verify no postgres '22P02' / 'invalid input syntax for type uuid' lines appear)
- [ ] e) /admin lista → cancelling sub row shows amber pill; non-cancelling rows show plain "active"

If any step fails, **do not merge**. Add a comment with the failure and re-run after fix.
```

The agentic execution stops at Step F.3 — the human owns the smoke loop from there.

---

## Self-review checklist (run before declaring plan ready)

- [x] **Spec coverage:** Bug 1 (status display) → Task 1 (badge + Acceso termina line, minimum surface). Bug 2 (UUID validation) → Task 2. Bug 3 (UI refresh + fail-closed semantics) → Task 3.
- [x] **Placeholder scan:** no TBDs, no "add appropriate validation", every code step shows full code.
- [x] **Type consistency:** `isValidUuid` signature used identically in Tasks 2.3 and 2.7. `appendAudit` signature matches `src/lib/audit.ts:3` (verified by reading the file).
- [x] **Drift notes section** present and explains why "Bug 1: text already there" is interpreted as "Bug 1: amber badge + Acceso termina line" (no helper extraction per user direction).
- [x] **Amendments applied:**
  - Amendment 1 (Bug 1 minimum surface, no helper) — Task 1 rewritten as 5 steps, files reduced from 6 to 2.
  - Amendment 2 (Bug 3 fail-closed) — route step adds try/catch + audit_log + 500 + Spanish message; client adds alert on non-OK; new test case covers it.
  - Amendment 3 (TDD coverage) — uuid tests cover valid v4, ".env", "../etc/passwd", "123", empty, null/undefined, whitespace, trailing chars. Optimistic write tests cover success, post-Stripe DB failure (500 + audit + DB untouched), and webhook compensation idempotency. /admin/[id] integration covers ".env" / "../etc/passwd" / "123" / empty / valid UUID happy path + no-stderr-noise assertion.
  - Amendment 4 (Visual smoke ownership) — dev-server smoke steps removed from Tasks 1, 2, 3; "Visual smoke ownership" section added with PR-description checklist (a/b/c/d/e) that developer copies into the GitHub PR body.
- [x] **Commit messages** match the user's required format.
- [x] **Scope discipline:** no auditing of rate-limiting / CSP / other admin actions — only the 3 surfaced bugs + UUID guard on the one route that has [param].
