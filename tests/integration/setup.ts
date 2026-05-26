import { beforeAll, beforeEach } from 'vitest';
import { db } from '@/db/client';
import { products } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

const TABLES_TO_WIPE: string[] = ['audit_log', 'sessions', 'stripe_events', 'auth_tokens', 'subscriptions', 'subscribers', 'rate_limit_attempts', 'waitlist'];

// Pre-launch hotfix: the Neon "main" branch is currently shared between
// local dev and production Vercel (DATABASE_URL_TEST split deferred to
// Phase 6.5). A bare `vitest run` would TRUNCATE production data via the
// beforeEach below. Gate the suite behind an explicit env var so that an
// accidental test invocation fails fast WITHOUT touching the database.
// See docs/known-issues-pre-launch.md.
beforeAll(async () => {
  if (process.env.ALLOW_DESTRUCTIVE_TESTS !== 'true') {
    throw new Error(
      [
        '',
        'Integration tests refuse to run: ALLOW_DESTRUCTIVE_TESTS env var not set.',
        '',
        'These tests TRUNCATE shared tables (subscribers, subscriptions, audit_log, ...) before each test.',
        'The Neon "main" branch is currently shared between local dev and production —',
        'running tests without the gate would destroy production data.',
        '',
        'Safe workflow:',
        '  1. Confirm DATABASE_URL in .env.local points to a non-prod DB, OR',
        '  2. Manually back up production data first, THEN',
        '  3. Run:  ALLOW_DESTRUCTIVE_TESTS=true npm test',
        '',
        'Manual reset (without running tests):',
        '  ALLOW_DESTRUCTIVE_TESTS=true npx tsx scripts/test-db-reset.ts',
        '',
        'See docs/known-issues-pre-launch.md for full context.',
        '',
      ].join('\n'),
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
