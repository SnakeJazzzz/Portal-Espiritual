import '../helpers/resend-mock';
import '../helpers/stripe-mock-with-state';
import { resetSentEmails } from '../helpers/resend-mock';
import { stripeState } from '../helpers/stripe-mock-with-state';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- NextRequest cast for route handler in tests; matches established pattern in webhook-happy-path.test.ts
function postWebhook(event: any) {
  return POST(new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'mock' },
    body: JSON.stringify(event),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural compat between Request and NextRequest at runtime
  }) as any);
}

beforeEach(() => { resetSentEmails(); stripeState.reset(); });

describe('stripeCustomerId preservation on subscriber upsert', () => {
  it('preserves existing stripeCustomerId when a second checkout uses a different customer for the same email', async () => {
    // Seed: existing subscriber with cus_AAA (simulates post-cancel re-subscription scenario,
    // OR an anonymous re-checkout when subscriber row exists from prior interaction)
    const product = (await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') }))!;
    expect(product).toBeTruthy();
    const [existingSub] = await db.insert(subscribers).values({
      email: 'preserved@example.com',
      stripeCustomerId: 'cus_AAA',
    }).returning();
    expect(existingSub.stripeCustomerId).toBe('cus_AAA');

    // Fire checkout.session.completed with the SAME email but a DIFFERENT customer
    stripeState.seedSubscription('sub_new');
    stripeState.seedPaymentIntent('pi_new');
    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_preserve',
      email: 'preserved@example.com',
      stripeSubscriptionId: 'sub_new',
      stripeCustomerId: 'cus_BBB', // ← different from cus_AAA
      paymentIntentId: 'pi_new',
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const r = await postWebhook(event);
      expect(r.status).toBe(200);

      // Subscriber row: stripeCustomerId stays at cus_AAA
      const after = await db.query.subscribers.findFirst({
        where: eq(subscribers.email, 'preserved@example.com'),
      });
      expect(after?.stripeCustomerId).toBe('cus_AAA');

      // Subscription row was still created (upsert didn't bail)
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.stripeSubscriptionId, 'sub_new'),
      });
      expect(subscription).toBeTruthy();
      expect(subscription?.subscriberId).toBe(existingSub.id);

      // Warning logged once with the expected payload shape
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        '[handle-checkout-completed] mismatched stripeCustomerId on upsert, keeping existing',
        expect.objectContaining({
          eventId: 'evt_preserve',
          existingStripeCustomerId: 'cus_AAA',
          incomingStripeCustomerId: 'cus_BBB',
          incomingSubscriptionId: 'sub_new',
        }),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('backfills stripeCustomerId when existing subscriber has none', async () => {
    const [orphan] = await db.insert(subscribers).values({
      email: 'orphan@example.com',
      stripeCustomerId: null,
    }).returning();

    stripeState.seedSubscription('sub_orphan');
    stripeState.seedPaymentIntent('pi_orphan');
    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_backfill',
      email: 'orphan@example.com',
      stripeSubscriptionId: 'sub_orphan',
      stripeCustomerId: 'cus_FILL',
      paymentIntentId: 'pi_orphan',
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const r = await postWebhook(event);
      expect(r.status).toBe(200);

      const after = await db.query.subscribers.findFirst({
        where: eq(subscribers.email, 'orphan@example.com'),
      });
      expect(after?.stripeCustomerId).toBe('cus_FILL');
      expect(after?.id).toBe(orphan.id);

      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
