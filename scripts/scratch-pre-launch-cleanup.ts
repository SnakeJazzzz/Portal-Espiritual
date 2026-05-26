import { db } from '@/db/client';
import {
  auditLog,
  authTokens,
  sessions,
  stripeEvents,
  subscriptions,
  subscribers,
  products,
  waitlist,
} from '@/db/schema';
import { getEnv } from '@/lib/env';
import { ne, sql } from 'drizzle-orm';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const env = getEnv();
  if (!env.ADMIN_SEED_EMAIL) {
    console.error('ADMIN_SEED_EMAIL not set — refusing to run (would delete ALL subscribers)');
    process.exit(1);
  }

  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== REAL CLEANUP MODE ===');
  console.log(`ADMIN_SEED_EMAIL preserved: ${env.ADMIN_SEED_EMAIL}\n`);

  const countQ = sql<number>`count(*)::int`;

  const pre = {
    audit_log: (await db.select({ c: countQ }).from(auditLog))[0].c,
    auth_tokens: (await db.select({ c: countQ }).from(authTokens))[0].c,
    sessions: (await db.select({ c: countQ }).from(sessions))[0].c,
    stripe_events: (await db.select({ c: countQ }).from(stripeEvents))[0].c,
    subscriptions: (await db.select({ c: countQ }).from(subscriptions))[0].c,
    subscribers: (await db.select({ c: countQ }).from(subscribers))[0].c,
    products: (await db.select({ c: countQ }).from(products))[0].c,
    waitlist: (await db.select({ c: countQ }).from(waitlist))[0].c,
  };
  console.log('PRE counts:', pre);

  if (!DRY_RUN) {
    await db.delete(auditLog);
    await db.delete(authTokens);
    await db.delete(sessions);
    await db.delete(stripeEvents);
    await db.delete(subscriptions);
    await db.delete(subscribers).where(ne(subscribers.email, env.ADMIN_SEED_EMAIL));
  }

  const post = DRY_RUN
    ? {
        audit_log: 0,
        auth_tokens: 0,
        sessions: 0,
        stripe_events: 0,
        subscriptions: 0,
        subscribers: 1,
        products: pre.products,
        waitlist: pre.waitlist,
      }
    : {
        audit_log: (await db.select({ c: countQ }).from(auditLog))[0].c,
        auth_tokens: (await db.select({ c: countQ }).from(authTokens))[0].c,
        sessions: (await db.select({ c: countQ }).from(sessions))[0].c,
        stripe_events: (await db.select({ c: countQ }).from(stripeEvents))[0].c,
        subscriptions: (await db.select({ c: countQ }).from(subscriptions))[0].c,
        subscribers: (await db.select({ c: countQ }).from(subscribers))[0].c,
        products: (await db.select({ c: countQ }).from(products))[0].c,
        waitlist: (await db.select({ c: countQ }).from(waitlist))[0].c,
      };
  console.log(DRY_RUN ? 'POST counts (projected):' : 'POST counts:', post);

  console.log('\nDELETED (projected):', {
    audit_log: pre.audit_log - post.audit_log,
    auth_tokens: pre.auth_tokens - post.auth_tokens,
    sessions: pre.sessions - post.sessions,
    stripe_events: pre.stripe_events - post.stripe_events,
    subscriptions: pre.subscriptions - post.subscriptions,
    subscribers: pre.subscribers - post.subscribers,
  });

  console.log('\nPRESERVED unchanged:', {
    products: post.products,
    waitlist: post.waitlist,
  });

  if (!DRY_RUN) {
    if (post.subscribers !== 1) {
      console.error(`\nFAIL: expected 1 subscriber (JP only), got ${post.subscribers}`);
      process.exit(1);
    }
    if (post.products < 1) {
      console.error('\nFAIL: products table empty — should have mentoría row');
      process.exit(1);
    }
  }

  console.log(DRY_RUN ? '\n=== DRY RUN OK — re-run without --dry-run to apply ===' : '\n=== CLEANUP DONE ===');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
