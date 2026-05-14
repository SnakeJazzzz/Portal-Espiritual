import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

// In S3 we add the subscriptions table. Until then, the active count is always 0.
// This function is updated in S3 (Task 3.x) to actually query subscriptions.
export async function getCapacity(productSlug: string): Promise<{ used: number; total: number | null }> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug) });
  if (!product) throw new Error(`Unknown product: ${productSlug}`);
  // TODO(S3): query active subs
  return { used: 0, total: product.capacity };
}

export function isFull({ used, total }: { used: number; total: number | null }): boolean {
  if (total === null) return false;
  return used >= total;
}
