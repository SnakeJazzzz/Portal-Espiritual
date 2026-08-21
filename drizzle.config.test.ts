import type { Config } from 'drizzle-kit';

// Migration config for the Neon "test" branch (DATABASE_URL_TEST).
// drizzle.config.ts reads DATABASE_URL (production), so migrations applied
// there never reach the test branch — every migration must be applied to
// BOTH branches or the schemas drift and the integration suite tests a
// stale schema. Usage:
//   node --env-file=.env.local npm run db:migrate:test
const url = process.env.DATABASE_URL_TEST;
if (!url) {
  throw new Error(
    'db:migrate:test requires DATABASE_URL_TEST (Neon test branch). ' +
    'Run with: node --env-file=.env.local npm run db:migrate:test',
  );
}

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
} satisfies Config;
