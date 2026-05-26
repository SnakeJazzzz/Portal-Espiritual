// Manual destructive reset of the integration-test tables.
//
// Mirrors the TRUNCATE that tests/integration/setup.ts runs in beforeEach,
// but as an explicit user-invoked command. Useful when:
//   - dev wants a clean DB without running the full vitest suite
//   - dev needs to recover from a partial test run
//
// Defense in depth: requires ALLOW_DESTRUCTIVE_TESTS=true. The Neon "main"
// branch is currently shared between local dev and production Vercel —
// the env-var gate prevents an accidental `tsx scripts/test-db-reset.ts`
// from destroying production data (split deferred to Phase 6.5).
//
// Usage:
//   ALLOW_DESTRUCTIVE_TESTS=true npx tsx scripts/test-db-reset.ts
//
// After running this, re-seed if needed:
//   npm run db:seed                     # products
//   npx tsx scripts/seed-admin.ts       # admin (Juan Pablo)
//
// See docs/known-issues-pre-launch.md for the full context.

import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { getEnv } from '@/lib/env';

const TABLES_TO_WIPE = [
  'audit_log',
  'sessions',
  'stripe_events',
  'auth_tokens',
  'subscriptions',
  'subscribers',
  'rate_limit_attempts',
  'waitlist',
];

function dbHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return '<unparseable DATABASE_URL>';
  }
}

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_TESTS !== 'true') {
    console.error(
      [
        '',
        'Refusing to run: ALLOW_DESTRUCTIVE_TESTS env var not set.',
        '',
        'This script TRUNCATEs shared tables (subscribers, subscriptions, audit_log, ...).',
        'The Neon "main" branch is currently shared between dev and production —',
        'running this without the gate would destroy production data.',
        '',
        'If you have confirmed DATABASE_URL points to a non-prod DB, re-run:',
        '  ALLOW_DESTRUCTIVE_TESTS=true npx tsx scripts/test-db-reset.ts',
        '',
        'See docs/known-issues-pre-launch.md for full context.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }

  const env = getEnv();
  console.log(`Target DB host: ${dbHost(env.DATABASE_URL)}`);
  console.log(`Tables to truncate: ${TABLES_TO_WIPE.join(', ')}`);
  console.log('Running TRUNCATE ... CASCADE');

  await db.execute(sql.raw(`TRUNCATE ${TABLES_TO_WIPE.join(', ')} CASCADE;`));

  console.log('Done. Re-seed if needed:');
  console.log('  npm run db:seed');
  console.log('  npx tsx scripts/seed-admin.ts');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
