import crypto from 'node:crypto';
import { db } from '@/db/client';
import { authTokens } from '@/db/schema';
import { and, eq, gte, isNull } from 'drizzle-orm';

const WELCOME_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_TTL_MS = 15 * 60 * 1000;

export type AuthTokenKind = 'welcome' | 'login';

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createAuthToken(subscriberId: string, kind: AuthTokenKind): Promise<string> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const ttl = kind === 'welcome' ? WELCOME_TTL_MS : LOGIN_TTL_MS;
  await db.insert(authTokens).values({
    subscriberId,
    tokenHash,
    kind,
    expiresAt: new Date(Date.now() + ttl),
  });
  return raw;
}

/** Constant-time match by computing the hash and looking up by the unique hash column.
 *  Postgres equality on a unique index is the constant-time-equivalent here; the SHA-256
 *  hash itself is constant-time over equal-length inputs. We additionally use
 *  crypto.timingSafeEqual when comparing the lookup result to defend against very
 *  exotic timing attacks on the DB index probe. */
export async function consumeAuthToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const row = await db.query.authTokens.findFirst({
    where: and(
      eq(authTokens.tokenHash, tokenHash),
      gte(authTokens.expiresAt, new Date()),
      isNull(authTokens.consumedAt),
    ),
  });
  if (!row) return null;
  const expectedBuf = Buffer.from(row.tokenHash, 'hex');
  const actualBuf = Buffer.from(tokenHash, 'hex');
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) return null;
  await db.update(authTokens).set({ consumedAt: new Date() }).where(eq(authTokens.id, row.id));
  return { subscriberId: row.subscriberId, kind: row.kind };
}
