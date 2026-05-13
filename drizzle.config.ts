import type { Config } from 'drizzle-kit';
import { getEnv } from './src/lib/env';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: getEnv().DATABASE_URL },
  strict: true,
  verbose: true,
} satisfies Config;
