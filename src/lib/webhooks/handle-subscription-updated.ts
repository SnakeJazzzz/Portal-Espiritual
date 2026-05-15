import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

// `s: string` (not `Stripe.Subscription.Status`): the defensive fallback catches
// future enum additions Stripe ships before our SDK types know about them.
export function mapStatus(s: string): 'active' | 'past_due' | 'canceled' {
  if (s === 'active' || s === 'trialing') return 'active';
  if (s === 'past_due' || s === 'unpaid' || s === 'incomplete' || s === 'paused') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled';
  console.error('[mapStatus] unknown Stripe subscription status; mapping to past_due defensively', { received: s });
  return 'past_due';
}

export async function handleSubscriptionUpdated(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  const item = sub.items?.data?.[0] as (typeof sub.items.data[0] & {
    current_period_start: number;
    current_period_end: number;
  }) | undefined;
  const periodUpdate = item
    ? {
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
      }
    : {};
  await db.update(subscriptions).set({
    status: mapStatus(sub.status),
    ...periodUpdate,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, sub.id));
}
