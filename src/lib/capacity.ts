import { db } from '@/db/client';
import { products, subscriptions } from '@/db/schema';
import { and, count, eq, inArray, sql } from 'drizzle-orm';

export async function getCapacity(productSlug: string): Promise<{ used: number; total: number | null; productId: string }> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug) });
  if (!product) throw new Error(`Unknown product: ${productSlug}`);
  const [{ value }] = await db
    .select({ value: count() })
    .from(subscriptions)
    .where(and(
      eq(subscriptions.productId, product.id),
      inArray(subscriptions.status, ['active', 'past_due']),
    ));
  return { used: Number(value), total: product.capacity, productId: product.id };
}

export function isFull({ used, total }: { used: number; total: number | null }): boolean {
  if (total === null) return false;
  return used >= total;
}

/**
 * Atomically insert a subscription row only if capacity is available.
 *
 * Combines INSERT + capacity check + RETURNING into a single SQL statement so two
 * concurrent webhook deliveries cannot both pass a SELECT-then-INSERT race.
 *
 * Distinguishes three outcomes:
 *  - inserted=true                                  → row created (capacity available, no existing active sub)
 *  - inserted=false, reason='capacity_full'         → SELECT COUNT clause filtered out the INSERT
 *  - inserted=false, reason='duplicate_subscription'→ partial unique index on (subscriber_id, product_id)
 *                                                     WHERE status IN ('active','past_due') rejected the row
 *
 * The constraint name `subscriptions_active_subscriber_per_product` is the partial
 * unique index created in migration 0001_subscriptions.sql. Verified by reading
 * that migration directly — Drizzle did not rename it.
 */
export async function insertSubscriptionIfCapacity(params: {
  subscriberId: string;
  productId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}): Promise<{ inserted: boolean; reason?: 'capacity_full' | 'duplicate_subscription' }> {
  try {
    const result = await db.execute(sql`
      INSERT INTO subscriptions (
        subscriber_id, product_id, status, stripe_subscription_id,
        current_period_start, current_period_end, sessions_remaining
      )
      SELECT ${params.subscriberId}::uuid, ${params.productId}::uuid, 'active',
             ${params.stripeSubscriptionId},
             ${params.currentPeriodStart}, ${params.currentPeriodEnd}, 2
      WHERE (
        SELECT COUNT(*) FROM subscriptions
        WHERE product_id = ${params.productId}::uuid
          AND status IN ('active', 'past_due')
      ) < (SELECT capacity FROM products WHERE id = ${params.productId}::uuid)
      RETURNING id;
    `);
    if (result.rows.length === 0) {
      return { inserted: false, reason: 'capacity_full' };
    }
    return { inserted: true };
  } catch (err) {
    const msg = String((err as Error).message ?? '');
    // Partial unique index from migration 0001_subscriptions.sql.
    if (msg.includes('subscriptions_active_subscriber_per_product')) {
      return { inserted: false, reason: 'duplicate_subscription' };
    }
    throw err;
  }
}
