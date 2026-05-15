// vi.mock factories are hoisted to the top of the file that calls vi.mock,
// and Vitest's per-file isolation (fileParallelism: false in vitest.config.ts +
// per-file module mock scoping) means this mock only applies to test files that
// import this helper. Existing tests that do NOT import this file are unaffected.
import { vi } from 'vitest';

interface PaymentIntentState { id: string; refunded: boolean; }
interface SubscriptionState {
  id: string;
  status: 'active' | 'canceled';
  // Post-Basil: period fields belong on items, not the subscription. Mirror
  // Stripe's API shape so handlers under test see the same structure.
  items: { data: Array<{ current_period_start: number; current_period_end: number }> };
}

export const stripeState = {
  paymentIntents: new Map<string, PaymentIntentState>(),
  subscriptions: new Map<string, SubscriptionState>(),
  reset() { this.paymentIntents.clear(); this.subscriptions.clear(); },
  seedSubscription(id: string) {
    this.subscriptions.set(id, {
      id, status: 'active',
      items: {
        data: [{
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        }],
      },
    });
  },
  seedPaymentIntent(id: string) {
    this.paymentIntents.set(id, { id, refunded: false });
  },
  /** Test assertion helper: is the payment intent refunded? */
  isRefunded(id: string): boolean {
    return this.paymentIntents.get(id)?.refunded ?? false;
  },
};

vi.mock('@/lib/stripe', async () => {
  const real = await vi.importActual<typeof import('@/lib/stripe')>('@/lib/stripe');
  return {
    ...real,
    stripe: {
      ...real.stripe,
      webhooks: { constructEvent: (raw: string) => JSON.parse(raw) },
      subscriptions: {
        retrieve: vi.fn(async (id: string) => {
          const existing = stripeState.subscriptions.get(id);
          if (existing) return existing;
          stripeState.seedSubscription(id);
          return stripeState.subscriptions.get(id);
        }),
        cancel: vi.fn(async (id: string) => {
          const s = stripeState.subscriptions.get(id);
          if (s) s.status = 'canceled';
          return s;
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial-shape mock of Stripe SDK; full type would require restating dozens of methods
        update: vi.fn(async (id: string, params: any) => ({ id, ...params })),
      },
      refunds: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial-shape mock of Stripe SDK; full type would require restating dozens of methods
        create: vi.fn(async (params: any) => {
          const pi = stripeState.paymentIntents.get(params.payment_intent);
          if (!pi) throw new Error(`unknown payment_intent: ${params.payment_intent}`);
          pi.refunded = true;
          return { id: `re_${params.payment_intent}`, payment_intent: params.payment_intent };
        }),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- partial-shape mock of Stripe SDK; full type would require restating dozens of methods
    } as any,
  };
});
