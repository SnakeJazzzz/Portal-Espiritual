import { db } from '@/db/client';
import { products, subscriptions } from '@/db/schema';
import { and, count, eq, inArray } from 'drizzle-orm';

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
