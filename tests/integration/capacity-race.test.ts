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
import type Stripe from 'stripe';

function postWebhook(event: Stripe.Event) {
  return POST(new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'mock' },
    body: JSON.stringify(event),
    // NextRequest extends Request; the route handler treats the body+headers identically.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- POST signature wants NextRequest; Request is a structural superset for the headers/body the handler reads.
  }) as any);
}

beforeEach(() => { resetSentEmails(); stripeState.reset(); });

describe('Test 2 — Capacity race (full cap)', () => {
  it('9th checkout: no new subscription row, race email sent, payment refunded', async () => {
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');

    // Seed 8 active subscriptions (cap is 8 per spec).
    for (let i = 0; i < 8; i++) {
      const [seed] = await db.insert(subscribers)
        .values({ email: `seed${i}@example.com` })
        .returning();
      await db.insert(subscriptions).values({
        subscriberId: seed.id,
        productId: product.id,
        status: 'active',
        stripeSubscriptionId: `sub_seed_${i}`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
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
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r = await postWebhook(event);
    expect(r.status).toBe(200);

    // Spec §15.1 Test 2: DB still has exactly 8 active subscription rows.
    const [{ value: activeCount }] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.productId, product.id),
        inArray(subscriptions.status, ['active', 'past_due']),
      ));
    expect(activeCount).toBe(8);

    // Spec §15.1 Test 2: race-condition email delivered to the 9th user.
    const raceEmail = sentEmails.find((e) => e.to === 'overflow@example.com');
    expect(raceEmail?.subject).toBe('Tu suscripción a Mentoría no pudo completarse');

    // Spec §15.1 Test 2: refund reflected in external payment state.
    expect(stripeState.isRefunded('pi_race_9')).toBe(true);

    // Spec §15.1 Test 2: overflow subscriber row may or may not exist; if it does,
    // no subscriptions row attaches to it.
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
