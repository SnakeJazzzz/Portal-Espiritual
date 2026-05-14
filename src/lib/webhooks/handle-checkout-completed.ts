import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { stripe } from '@/lib/stripe';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { getEnv } from '@/lib/env';

export async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const email = (session.customer_details?.email ?? '').toLowerCase();
  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
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

  // 3. Insert subscription (idempotent by stripeSubscriptionId unique)
  await db.insert(subscriptions).values({
    subscriberId: sub_row.id,
    productId: product.id,
    status: 'active',
    stripeSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
    sessionsRemaining: 2,
  }).onConflictDoNothing({ target: subscriptions.stripeSubscriptionId });

  // 4. Issue welcome token + send email
  const raw = await createAuthToken(sub_row.id, 'welcome');
  const magicLinkUrl = `${getEnv().APP_URL}/api/auth/verify?token=${raw}`;
  const result = await sendWelcomeEmail({
    to: email,
    magicLinkUrl,
    idempotencyHeader: `${event.id}:welcome_email`,
  });
  await db.update(subscriptions)
    .set({ welcomeEmailStatus: result.error ? 'failed' : 'sent' })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}
