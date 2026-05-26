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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- POST signature wants NextRequest; Request is a structural superset for the headers/body the handler reads.
  }) as any);
}

beforeEach(() => { resetSentEmails(); stripeState.reset(); });

describe('Test 3 — Capacity with mixed statuses', () => {
  it('5 active + 3 canceled → 9th checkout succeeds (count filters by status)', async () => {
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');

    // 5 active rows
    for (let i = 0; i < 5; i++) {
      const [seed] = await db.insert(subscribers)
        .values({ email: `act${i}@example.com` })
        .returning();
      await db.insert(subscriptions).values({
        subscriberId: seed.id,
        productId: product.id,
        status: 'active',
        stripeSubscriptionId: `sub_act_${i}`,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
        sessionsRemaining: 2,
      });
    }
    // 3 canceled rows (should NOT count toward capacity per spec §15.1 Test 3)
    for (let i = 0; i < 3; i++) {
      const [seed] = await db.insert(subscribers)
        .values({ email: `can${i}@example.com` })
        .returning();
      await db.insert(subscriptions).values({
        subscriberId: seed.id,
        productId: product.id,
        status: 'canceled',
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
      eventId: 'evt_mixed',
      email: 'newperson@example.com',
      stripeSubscriptionId: 'sub_new',
      stripeCustomerId: 'cus_new',
      paymentIntentId: 'pi_new',
      periodStart: Date.now() / 1000,
      periodEnd: Date.now() / 1000 + 30 * 86400,
    });
    const r = await postWebhook(event);
    expect(r.status).toBe(200);

    // Spec §15.1 Test 3: DB has 6 active rows. Canceled rows don't block.
    // This guards against COUNT(*) regressing to ignore the status filter.
    const [{ value: activeCount }] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(and(
        eq(subscriptions.productId, product.id),
        inArray(subscriptions.status, ['active', 'past_due']),
      ));
    expect(activeCount).toBe(6);

    // Spec §15.1 Test 3 (plan addendum line 3196): the new user has a welcome email
    // and welcomeEmailStatus='sent' on the row.
    const newSubscriberRow = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, 'newperson@example.com'),
    });
    expect(newSubscriberRow).toBeTruthy();
    const newSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.subscriberId, newSubscriberRow!.id),
    });
    expect(newSubscription?.welcomeEmailStatus).toBe('sent');

    const welcomeEmail = sentEmails.find((e) => e.to === 'newperson@example.com');
    expect(welcomeEmail).toBeTruthy();
  });
});
