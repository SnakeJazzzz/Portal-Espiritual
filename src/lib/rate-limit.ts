import { db } from '@/db/client';
import { rateLimitAttempts } from '@/db/schema';
import { and, count, eq, gte } from 'drizzle-orm';

/**
 * DB-backed per-IP rate limiter.
 *
 * INSERT-first pattern: the request being checked is recorded before the
 * count is taken. A request that gets rate-limited still contaminates its
 * own window for windowSeconds. Acceptable trade-off vs a race window
 * (COUNT-then-INSERT) that would let a burst attack slip through under
 * concurrent requests.
 *
 * The WHERE clause must match on (endpoint, ip) jointly — Test 11 in the
 * spec guards against a global-counter regression where ip is missing
 * from the predicate.
 */
export async function checkRateLimit(opts: {
  endpoint: string;
  ip: string;
  windowSeconds: number;
  maxAttempts: number;
}): Promise<{ allowed: boolean }> {
  await db.insert(rateLimitAttempts).values({
    endpoint: opts.endpoint,
    ip: opts.ip,
  });

  const windowStart = new Date(Date.now() - opts.windowSeconds * 1000);
  const [{ attemptsInLastMinute }] = await db
    .select({ attemptsInLastMinute: count() })
    .from(rateLimitAttempts)
    .where(
      and(
        eq(rateLimitAttempts.endpoint, opts.endpoint),
        eq(rateLimitAttempts.ip, opts.ip),
        gte(rateLimitAttempts.attemptedAt, windowStart),
      ),
    );

  return { allowed: Number(attemptsInLastMinute) <= opts.maxAttempts };
}
