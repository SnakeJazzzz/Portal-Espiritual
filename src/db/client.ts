import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { getEnv } from '@/lib/env';
import * as schema from './schema';

const { DATABASE_URL } = getEnv();
const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });
export type DB = typeof db;
