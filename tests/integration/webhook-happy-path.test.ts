import '../helpers/resend-mock';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';

// Mock Stripe SDK calls used by the handler/route
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
