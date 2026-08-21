import { beforeAll, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const TABLES_TO_WIPE: string[] = ['audit_log', 'sessions', 'stripe_events', 'auth_tokens', 'subscriptions', 'subscribers', 'rate_limit_attempts', 'waitlist'];

// The suite runs against the Neon "test" branch: env-guard.ts (first
// vitest setup file, see vitest.config.ts) validates DATABASE_URL_TEST
// and remaps DATABASE_URL onto it BEFORE the @/db/client import above
// executes. The gate below is defense-in-depth: it re-checks the opt-in
// in case env-guard.ts is ever removed from setupFiles or reordered.
beforeAll(async () => {
  if (process.env.ALLOW_DESTRUCTIVE_TESTS !== 'true') {
    throw new Error(
      'Integration tests refuse to run: ALLOW_DESTRUCTIVE_TESTS env var not set. ' +
      'These tests TRUNCATE tables before each test. Run: ' +
      'ALLOW_DESTRUCTIVE_TESTS=true node --env-file=.env.local ./node_modules/.bin/vitest run',
    );
  }

  const rows = await db.select().from(products).where(eq(products.slug, 'mentoria-1a1'));
  if (rows.length === 0) {
    throw new Error(
      'Integration tests require the products table to be seeded with the mentoría row. ' +
      'Run `npm run db:seed` (or `node --env-file=.env.local ./node_modules/.bin/tsx scripts/seed-products.ts`) before running tests.',
    );
  }
});

beforeEach(async () => {
  if (TABLES_TO_WIPE.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE ${TABLES_TO_WIPE.join(', ')} CASCADE;`));
});
