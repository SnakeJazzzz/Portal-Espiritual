import { beforeEach } from 'vitest';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

const TABLES_TO_WIPE: string[] = [];

beforeEach(async () => {
  if (TABLES_TO_WIPE.length === 0) return;
  await db.execute(sql.raw(`TRUNCATE ${TABLES_TO_WIPE.join(', ')} CASCADE;`));
});
