import {
  pgTable, uuid, text, integer, jsonb, timestamp, pgEnum, boolean, customType, inet, index,
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

const citext = customType<{ data: string }>({
  dataType() { return 'citext'; },
});

export const subscriberRole = pgEnum('subscriber_role', ['subscriber', 'admin']);
export const subscriptionStatus = pgEnum('subscription_status', ['active', 'past_due', 'canceled']);
export const welcomeEmailStatus = pgEnum('welcome_email_status', ['pending', 'sent', 'failed', 'bounced']);
export const authTokenKind = pgEnum('auth_token_kind', ['welcome', 'login']);

export const subscribers = pgTable('subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: citext('email').notNull().unique(),
  role: subscriberRole('role').notNull().default('subscriber'),
  stripeCustomerId: text('stripe_customer_id'),
  name: text('name'),
  instagramHandle: text('instagram_handle'),
  dateOfBirth: text('date_of_birth'),
  phone: text('phone'),
  timezone: text('timezone').notNull().default('America/Mexico_City'),
  notesFromSubscriber: text('notes_from_subscriber'),
  profileCompletedAt: timestamp('profile_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  status: subscriptionStatus('status').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  sessionsRemaining: integer('sessions_remaining').notNull(),
  welcomeEmailStatus: welcomeEmailStatus('welcome_email_status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').notNull().unique(),
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id),
  kind: authTokenKind('kind').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const stripeEvents = pgTable('stripe_events', {
  stripeEventId: text('stripe_event_id').primaryKey(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  subscriberId: uuid('subscriber_id').notNull().references(() => subscribers.id),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => subscribers.id),  // nullable for system actions
  action: text('action').notNull(),
  targetSubscriberId: uuid('target_subscriber_id').references(() => subscribers.id),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rateLimitAttempts = pgTable('rate_limit_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: text('endpoint').notNull(),
  ip: inet('ip').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  endpointIpAttemptedIdx: index('rate_limit_endpoint_ip_attempted')
    .on(table.endpoint, table.ip, table.attemptedAt.desc()),
}));
