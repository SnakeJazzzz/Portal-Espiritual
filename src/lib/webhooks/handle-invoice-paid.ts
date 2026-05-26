import type Stripe from 'stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const subRef = invoice.subscription;
  const subId = typeof subRef === 'string' ? subRef : (subRef?.id ?? null);
  if (!subId) return;
  await db.update(subscriptions).set({
    status: 'active',
    sessionsRemaining: 2,
    updatedAt: new Date(),
  }).where(eq(subscriptions.stripeSubscriptionId, subId));
}
