import {
  pgTable, uuid, text, integer, jsonb, timestamp, pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productKind = pgEnum('product_kind', ['subscription', 'one_off']);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: productKind('kind').notNull(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  priceMxn: integer('price_mxn').notNull(),
  currency: text('currency').notNull().default('MXN'),
  capacity: integer('capacity'),
  stripePriceId: text('stripe_price_id').notNull(),
  stripeProductId: text('stripe_product_id').notNull(),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
