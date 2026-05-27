import { describe, it, expect, vi, afterEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Admin id reused across mocks + cleanup. Matches the pattern in
// tests/integration/admin-sessions-remaining.test.ts: a fixed UUID lets the
// audit_log.admin_id FK (→ subscribers.id) resolve to a real seeded row.
const ADMIN_ID = '00000000-0000-0000-0000-000000000abc';

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
  return { ...real, requireAdmin: vi.fn(async () => ({ subscriber: { id: ADMIN_ID, role: 'admin' } })) };
});

import { POST } from '@/app/api/admin/cancel-subscription/route';

async function seed(opts: { email: string; stripeSubId: string; cancelAtPeriodEnd?: boolean }) {
  const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
  if (!product) throw new Error('mentoria product not seeded');
  // Seed admin row so the audit FK (adminId → subscribers.id) resolves.
  await db
    .insert(subscribers)
    .values({ id: ADMIN_ID, email: 'admin-cancel-test@example.com', role: 'admin' })
    .onConflictDoNothing();
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
    // Delete audit_log rows first — they FK-reference subscribers.id (admin + target).
    await db.delete(auditLog).where(eq(auditLog.adminId, ADMIN_ID));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_optimistic'));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_dbfail'));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_idempotent'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincanceloptim@example.com'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincanceldbfail@example.com'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincancelidem@example.com'));
    await db.delete(subscribers).where(eq(subscribers.id, ADMIN_ID));
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

    stripeUpdate.mockResolvedValueOnce({ id: 'sub_admin_cancel_dbfail', cancel_at_period_end: true });

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

    const stillFalse = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_dbfail'),
    });
    expect(stillFalse?.cancelAtPeriodEnd).toBe(false);

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
