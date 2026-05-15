import { describe, it, expect, vi } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeSubscriptionUpdatedEvent } from '../helpers/stripe-fixture';
import { mapStatus } from '@/lib/webhooks/handle-subscription-updated';

// Mock Stripe SDK calls used by the route's signature verification.
vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return {
    ...real,
    stripe: {
      ...real.stripe,
      webhooks: {
        constructEvent: (raw: string) => JSON.parse(raw), // bypass sig verify in tests
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

describe('mapStatus', () => {
  it('maps active to active', () => {
    expect(mapStatus('active')).toBe('active');
  });
  it('maps trialing to active', () => {
    expect(mapStatus('trialing')).toBe('active');
  });
  it('maps past_due to past_due', () => {
    expect(mapStatus('past_due')).toBe('past_due');
  });
  it('maps unpaid to past_due', () => {
    expect(mapStatus('unpaid')).toBe('past_due');
  });
  it('maps incomplete to past_due (SCA/3DS gate)', () => {
    expect(mapStatus('incomplete')).toBe('past_due');
  });
  it('maps paused to past_due', () => {
    expect(mapStatus('paused')).toBe('past_due');
  });
  it('maps canceled to canceled', () => {
    expect(mapStatus('canceled')).toBe('canceled');
  });
  it('maps incomplete_expired to canceled', () => {
    expect(mapStatus('incomplete_expired')).toBe('canceled');
  });
  it('defensively maps unknown status to past_due and logs to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(mapStatus('martian_state')).toBe('past_due');
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Test 6 — Cancel flow', () => {
  it('customer.subscription.updated with cancel_at_period_end=true updates the row, keeps status=active', async () => {
    // Seed subscriber + subscription
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');
    await db.insert(subscribers).values({ email: 'cancel@example.com', stripeCustomerId: 'cus_cancel_test' });
    const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.email, 'cancel@example.com') });
    if (!subscriber) throw new Error('subscriber seed failed');
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400 * 1000);
    await db.insert(subscriptions).values({
      subscriberId: subscriber.id,
      productId: product.id,
      status: 'active',
      stripeSubscriptionId: 'sub_cancel_test',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      sessionsRemaining: 2,
    });

    const event = makeSubscriptionUpdatedEvent({
      eventId: 'evt_cancel_1',
      stripeSubscriptionId: 'sub_cancel_test',
      cancelAtPeriodEnd: true,
      status: 'active',
    });
    const res = await postWebhook(event);
    expect(res.status).toBe(200);

    const updated = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeSubscriptionId, 'sub_cancel_test'),
    });
    expect(updated?.cancelAtPeriodEnd).toBe(true);
    expect(updated?.status).toBe('active');
    expect(updated?.canceledAt).toBeNull();
  });
});
