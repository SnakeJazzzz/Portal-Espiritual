import type Stripe from 'stripe';

export function makeCheckoutCompletedEvent(opts: {
  eventId: string;
  email: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  paymentIntentId: string;
  periodStart: number;
  periodEnd: number;
}): Stripe.Event {
  return {
    id: opts.eventId,
    object: 'event',
    api_version: '2025-02-24.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${opts.eventId}`,
        object: 'checkout.session',
        mode: 'subscription',
        customer: opts.stripeCustomerId,
        customer_details: { email: opts.email } as any,
        subscription: opts.stripeSubscriptionId,
        payment_intent: opts.paymentIntentId,
        status: 'complete',
      } as any,
    },
  } as Stripe.Event;
}
