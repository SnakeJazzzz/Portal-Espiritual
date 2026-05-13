import { db } from '@/db/client';
import { products } from '@/db/schema';
import { env } from '@/lib/env';
import { sql } from 'drizzle-orm';

async function main() {
  await db.insert(products).values({
    kind: 'subscription',
    slug: 'mentoria-1a1',
    name: 'Mentoría 1-a-1',
    priceMxn: 2222,
    currency: 'MXN',
    capacity: 8,
    stripePriceId: env.STRIPE_PRICE_ID_MENTORIA,
    stripeProductId: 'prod_placeholder',
    metadata: sql`'{}'::jsonb`,
  }).onConflictDoNothing({ target: products.slug });
  console.log('seeded mentoría product');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
