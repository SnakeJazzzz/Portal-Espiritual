import { describe, it, expect } from 'vitest';
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('products table', () => {
  it('has the seeded mentoría row', async () => {
    const rows = await db.select().from(products).where(eq(products.slug, 'mentoria-1a1'));
    expect(rows).toHaveLength(1);
    expect(rows[0].priceMxn).toBe(2222);
    expect(rows[0].capacity).toBe(8);
    expect(rows[0].kind).toBe('subscription');
  });
});
