import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { createAuthToken } from '@/lib/auth-tokens';
import {
  sendWelcomeEmail,
  sendRaceConditionEmail,
  sendDuplicateSubscriptionEmail,
} from '@/lib/email';
import { getEnv } from '@/lib/env';
import { insertSubscriptionIfCapacity } from '@/lib/capacity';
import { appendAudit } from '@/lib/audit';

const env = getEnv();

export async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const email = (session.customer_details?.email ?? '').toLowerCase();
  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
  const paymentIntentId = session.payment_intent as string | null;
  if (!email || !stripeSubscriptionId) throw new Error('checkout session missing email or subscription');

  // POST-BASIL: as of Stripe API 2025-03-31, current_period_start/end live on
  // items.data[N], not on the Subscription object. Reading the old top-level
  // path returns undefined → invalid Date. For mentoría's single-item recurring
  // price, the period is on items.data[0].
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const item = sub.items.data[0] as (typeof sub.items.data[0] & {
    current_period_start: number;
    current_period_end: number;
  }) | undefined;
  if (!item) throw new Error(`subscription ${sub.id} has no items`);
  const currentPeriodStart = new Date(item.current_period_start * 1000);
  const currentPeriodEnd = new Date(item.current_period_end * 1000);

  // 1. Upsert subscriber by email (idempotent: email is unique)
  await db.insert(subscribers).values({ email, stripeCustomerId }).onConflictDoUpdate({
    target: subscribers.email,
    set: { stripeCustomerId, updatedAt: new Date() },
  });
  const sub_row = await db.query.subscribers.findFirst({ where: eq(subscribers.email, email) });
  if (!sub_row) throw new Error('subscriber upsert disappeared');

  // 2. Look up product (assume mentoría for now; S6 generalizes)
  const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
  if (!product) throw new Error('mentoria product not seeded');

  // 3. Atomic capacity-aware insert — see insertSubscriptionIfCapacity
  // for outcome semantics. Single-statement SQL prevents the race
  // where two concurrent webhooks for the same stripe_subscription_id
  // both pass a capacity check then both INSERT. The unique
  // constraint on stripe_subscription_id serializes; only one wins.
  const result = await insertSubscriptionIfCapacity({
    subscriberId: sub_row.id,
    productId: product.id,
    stripeSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
  });

  if (result.inserted) {
    // Happy path: token + welcome email
    const raw = await createAuthToken(sub_row.id, 'welcome');
    const magicLinkUrl = `${env.APP_URL}/api/auth/verify?token=${raw}`;
    const emailResult = await sendWelcomeEmail({
      to: email,
      magicLinkUrl,
      idempotencyHeader: `${event.id}:welcome_email`,
    });
    await db.update(subscriptions)
      .set({ welcomeEmailStatus: emailResult.error ? 'failed' : 'sent' })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return;
  }

  // Refund path: both race + duplicate share the same Stripe-side mechanics.
  // Cancel the subscription (so Stripe doesn't keep billing) then refund the
  // initial payment intent. Idempotency keys are scoped to event.id so retries
  // of the same Stripe webhook delivery don't double-cancel or double-refund.
  if (paymentIntentId) {
    await stripe.subscriptions.cancel(stripeSubscriptionId, { invoice_now: false, prorate: false }, {
      idempotencyKey: `${event.id}:cancel`,
    });
    await stripe.refunds.create({ payment_intent: paymentIntentId }, {
      idempotencyKey: `${event.id}:refund`,
    });
  }

  if (result.reason === 'capacity_full') {
    await sendRaceConditionEmail({ to: email, idempotencyHeader: `${event.id}:race_email` });
    await appendAudit({
      adminId: null,
      action: 'capacity_race_refund',
      targetSubscriberId: sub_row.id,
      after: { stripeSubscriptionId, paymentIntentId },
    });
  } else if (result.reason === 'duplicate_subscription') {
    await sendDuplicateSubscriptionEmail({ to: email, idempotencyHeader: `${event.id}:duplicate_email` });
    await appendAudit({
      adminId: null,
      action: 'duplicate_subscription_refund',
      targetSubscriberId: sub_row.id,
      after: { stripeSubscriptionId, paymentIntentId },
    });
  }
}
