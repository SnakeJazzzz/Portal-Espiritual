import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { getEnv } from '@/lib/env';

async function main() {
  const env = getEnv();
  if (!env.ADMIN_SEED_EMAIL) {
    console.error('ADMIN_SEED_EMAIL not set in env');
    process.exit(1);
  }
  await db.insert(subscribers).values({
    email: env.ADMIN_SEED_EMAIL,
    role: 'admin',
    name: 'Juan Pablo',
    profileCompletedAt: new Date(),
  }).onConflictDoUpdate({
    target: subscribers.email,
    set: { role: 'admin', profileCompletedAt: new Date() },
  });
  console.log(`seeded admin: ${env.ADMIN_SEED_EMAIL}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
