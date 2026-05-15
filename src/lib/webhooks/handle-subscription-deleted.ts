import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleSubscriptionDeleted(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  await db.update(subscriptions).set({
    status: 'canceled',
    canceledAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, sub.id));
}
