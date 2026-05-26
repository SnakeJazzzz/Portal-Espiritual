import { describe, it, expect, vi, afterEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';

// vi.mock factories are hoisted above top-level code; vi.hoisted is the supported way
// to share a fn ref between the factory and the test body's assertions.
const { stripeUpdate } = vi.hoisted(() => ({ stripeUpdate: vi.fn(async () => ({ id: 'sub_admin_cancel_test', cancel_at_period_end: true })) }));

vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial-shape mock of Stripe SDK; full type would require restating dozens of methods
  return { ...real, stripe: { ...real.stripe, subscriptions: { update: stripeUpdate } } as any };
});

vi.mock('@/lib/auth', async () => {
  const real = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return { ...real, requireAdmin: vi.fn(async () => ({ subscriber: { id: 'admin_id', role: 'admin' } })) };
});

// Import the route AFTER mocks are declared so it picks up the mocked modules.
import { POST } from '@/app/api/admin/cancel-subscription/route';

describe('Test 6b — Admin cancel route', () => {
  afterEach(async () => {
    // Suite uses beforeEach TRUNCATE in setup.ts (clears state between tests).
    // afterEach here ensures rows don't survive the LAST test of the suite run —
    // otherwise the test residue pollutes manual inspection and getCapacity queries.
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_test'));
    await db.delete(subscribers).where(eq(subscribers.email, 'admincancel@example.com'));
  });

  it('calls stripe.subscriptions.update with cancel_at_period_end:true and returns 200', async () => {
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');
    await db.insert(subscribers).values({ email: 'admincancel@example.com', stripeCustomerId: 'cus_admin_cancel' });
    const subscriber = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, 'admincancel@example.com'),
    });
    if (!subscriber) throw new Error('subscriber seed failed');
    const now = new Date();
    await db.insert(subscriptions).values({
      subscriberId: subscriber.id,
      productId: product.id,
      status: 'active',
      stripeSubscriptionId: 'sub_admin_cancel_test',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86400 * 1000),
      sessionsRemaining: 2,
    });
    const row = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_admin_cancel_test'),
    });
    if (!row) throw new Error('subscription seed failed');

    stripeUpdate.mockClear();
    const res = await POST(new Request('http://localhost/api/admin/cancel-subscription', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subscriptionId: row.id }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- NextRequest cast for route handler in tests; standard Request shape suffices at runtime
    }) as any);

    expect(res.status).toBe(200);
    expect(stripeUpdate).toHaveBeenCalledTimes(1);
    expect(stripeUpdate).toHaveBeenCalledWith('sub_admin_cancel_test', { cancel_at_period_end: true });
  });
});
