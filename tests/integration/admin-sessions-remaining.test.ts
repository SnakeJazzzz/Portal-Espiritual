import { describe, it, expect, vi, afterEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products, auditLog } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// Admin id reused across mocks + cleanup
const ADMIN_ID = '00000000-0000-0000-0000-000000000aaa';

vi.mock('@/lib/auth', async () => {
  const real = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...real,
    requireAdmin: vi.fn(async () => ({
      subscriber: { id: ADMIN_ID, role: 'admin' },
      session: { id: 'session_admin_test' },
    })),
  };
});

// Import the route AFTER mocks
import { PATCH } from '@/app/api/admin/sessions-remaining/route';

describe('D6 — Admin sessions-remaining PATCH writes audit_log', () => {
  afterEach(async () => {
    await db.delete(auditLog).where(eq(auditLog.adminId, ADMIN_ID));
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_sessions_remaining_test'));
    await db.delete(subscribers).where(eq(subscribers.email, 'sessionsedit@example.com'));
  });

  it('updates subscriptions.sessionsRemaining and appends audit_log row with before/after', async () => {
    // Seed admin row so the audit FK (adminId → subscribers.id) is satisfied.
    await db.insert(subscribers).values({
      id: ADMIN_ID,
      email: 'admin-sessions-test@example.com',
      role: 'admin',
    }).onConflictDoNothing();

    // Seed target subscriber + subscription with sessionsRemaining = 2.
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');
    await db.insert(subscribers).values({ email: 'sessionsedit@example.com' });
    const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.email, 'sessionsedit@example.com') });
    if (!subscriber) throw new Error('subscriber seed failed');
    const now = new Date();
    await db.insert(subscriptions).values({
      subscriberId: subscriber.id,
      productId: product.id,
      status: 'active',
      stripeSubscriptionId: 'sub_sessions_remaining_test',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86400 * 1000),
      sessionsRemaining: 2,
    });
    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.stripeSubscriptionId, 'sub_sessions_remaining_test') });
    if (!sub) throw new Error('subscription seed failed');

    // PATCH from 2 → 5
    const res = await PATCH(new Request('http://localhost/api/admin/sessions-remaining', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscriptionId: sub.id, sessionsRemaining: 5 }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NextRequest cast for route handler in tests; matches admin-cancel.test.ts pattern
    }) as any);

    expect(res.status).toBe(200);

    // Assert subscription updated
    const updated = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, sub.id) });
    expect(updated?.sessionsRemaining).toBe(5);

    // Assert audit_log row written with correct shape
    const audits = await db.select().from(auditLog).where(
      and(eq(auditLog.adminId, ADMIN_ID), eq(auditLog.action, 'set_sessions_remaining')),
    );
    expect(audits).toHaveLength(1);
    expect(audits[0].targetSubscriberId).toBe(subscriber.id);
    expect(audits[0].before).toEqual({ sessionsRemaining: 2 });
    expect(audits[0].after).toEqual({ sessionsRemaining: 5 });
  });
});
