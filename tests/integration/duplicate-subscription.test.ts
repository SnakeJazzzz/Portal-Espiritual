import '../helpers/resend-mock';
import '../helpers/stripe-mock-with-state';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { stripeState } from '../helpers/stripe-mock-with-state';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { POST } from '@/app/api/webhooks/stripe/route';
import { makeCheckoutCompletedEvent } from '../helpers/stripe-fixture';
import type Stripe from 'stripe';

function postWebhook(event: Stripe.Event) {
  return POST(new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'mock' },
    body: JSON.stringify(event),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- POST signature wants NextRequest; Request is a structural superset for the headers/body the handler reads.
  }) as any);
}

beforeEach(() => { resetSentEmails(); stripeState.reset(); });

describe('Test 8 — Existing-active-sub double-payment guard', () => {
  it('second checkout for same email: 1 row, duplicate email delivered, refund issued', async () => {
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');

    // Existing subscriber with an active subscription.
    const [existing] = await db.insert(subscribers)
      .values({ email: 'dup@example.com' })
      .returning();
    await db.insert(subscriptions).values({
      subscriberId: existing.id,
      productId: product.id,
      status: 'active',
      stripeSubscriptionId: 'sub_dup_first',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      sessionsRemaining: 2,
    });

    stripeState.seedSubscription('sub_dup_second');
    stripeState.seedPaymentIntent('pi_dup');

    const event = makeCheckoutCompletedEvent({
      eventId: 'evt_dup',
      email: 'dup@example.com',
      stripeSubscriptionId: 'sub_dup_second',
      stripeCustomerId: 'cus_dup',
      paymentIntentId: 'pi_dup',
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r = await postWebhook(event);
    expect(r.status).toBe(200);

    // Spec §15.1 Test 8: exactly 1 subscription row for that subscriber; original unchanged.
    const rows = await db.select().from(subscriptions)
      .where(eq(subscriptions.subscriberId, existing.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].stripeSubscriptionId).toBe('sub_dup_first');

    // Spec §15.1 Test 8: duplicate-subscription email delivered (distinct subject from race email).
    const dupEmail = sentEmails.find((e) => e.to === 'dup@example.com');
    expect(dupEmail?.subject).toBe('Ya tienes una suscripción activa');

    // Spec §6.1.1 (implicit): the new payment was refunded.
    expect(stripeState.isRefunded('pi_dup')).toBe(true);
  });
});
