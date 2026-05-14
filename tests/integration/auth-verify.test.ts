import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock next/headers so cookies() works outside a request scope (vitest).
// We retain enough state to satisfy createSession/getSession/deleteSession
// and to record the options passed to set() (so the cookie-attribute test can
// assert HttpOnly/Secure/SameSite/Path/Max-Age).
type CookieEntry = { value: string; opts: Record<string, unknown> };
const cookieJar = new Map<string, CookieEntry>();
const lastSet: { name: string | null; opts: Record<string, unknown> | null } = { name: null, opts: null };

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => {
      const e = cookieJar.get(n);
      return e ? { name: n, value: e.value } : undefined;
    },
    set: (n: string, v: string, opts: Record<string, unknown> = {}) => {
      cookieJar.set(n, { value: v, opts });
      lastSet.name = n;
      lastSet.opts = opts;
    },
    delete: (n: string) => {
      cookieJar.delete(n);
    },
  }),
  headers: async () => new Map(),
}));

function buildSetCookieFromLast(): string {
  if (!lastSet.name || !lastSet.opts) return '';
  const o = lastSet.opts;
  const parts: string[] = [`${lastSet.name}=value`];
  if (o.maxAge != null) parts.push(`Max-Age=${o.maxAge}`);
  if (o.path) parts.push(`Path=${o.path}`);
  if (o.httpOnly) parts.push('HttpOnly');
  if (o.secure) parts.push('Secure');
  if (o.sameSite) {
    const s = String(o.sameSite);
    parts.push(`SameSite=${s.charAt(0).toUpperCase()}${s.slice(1)}`);
  }
  return parts.join('; ');
}

import { db } from '@/db/client';
import { subscribers, authTokens, sessions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { GET as verifyGET } from '@/app/api/auth/verify/route';
import { POST as logoutPOST } from '@/app/api/auth/logout/route';
import { createAuthToken } from '@/lib/auth-tokens';

beforeEach(() => {
  cookieJar.clear();
  lastSet.name = null;
  lastSet.opts = null;
});

async function makeSubscriber(email: string) {
  const [row] = await db.insert(subscribers).values({ email }).returning();
  return row;
}
function makeReq(url: string, init?: RequestInit) { return new NextRequest(url, init) as any; }

describe('Test 5 — Magic-link verify is single-use', () => {
  it('first verify succeeds, second verify returns 401', async () => {
    const sub = await makeSubscriber('singleuse@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    const r1 = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    expect([302, 303, 307]).toContain(r1.status);
    expect(lastSet.name).toBe('pe_session');
    expect(cookieJar.has('pe_session')).toBe(true);

    const r2 = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    expect(r2.status).toBe(401);
  });
});

describe('Test 9 — Magic-link security criteria', () => {
  it('plaintext token never appears in DB', async () => {
    const sub = await makeSubscriber('plaintext@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    const rows = await db.execute(sql`SELECT token_hash FROM auth_tokens`);
    for (const row of rows.rows as any[]) {
      expect(row.token_hash).not.toBe(raw);
      expect(row.token_hash).toHaveLength(64);
    }
  });

  it('expired token is rejected', async () => {
    const sub = await makeSubscriber('expired@example.com');
    const raw = await createAuthToken(sub.id, 'login');
    const hash = (await import('@/lib/auth-tokens')).hashToken(raw);
    await db.update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(authTokens.tokenHash, hash));
    const r = await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    expect(r.status).toBe(401);
  });

  it('cookie has HttpOnly + Secure + SameSite=Lax + Path=/ + Max-Age >= 30d', async () => {
    const sub = await makeSubscriber('cookie@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    // Assert directly against the captured cookie options (test mock can't
    // bridge to a real Set-Cookie header outside a Next request scope), and
    // also assert the synthesized Set-Cookie string matches the same regexes
    // the spec calls for.
    expect(lastSet.name).toBe('pe_session');
    expect(lastSet.opts?.httpOnly).toBe(true);
    // We read process.env directly (not getEnv()) because we're verifying
    // that createSession's secure flag matches APP_URL at runtime. Using
    // getEnv() here would tautologically pass even if createSession's
    // implementation diverged from APP_URL.
    const expectSecure = (process.env.APP_URL ?? '').startsWith('https://');
    expect(lastSet.opts?.secure).toBe(expectSecure);
    expect(String(lastSet.opts?.sameSite).toLowerCase()).toBe('lax');
    expect(lastSet.opts?.path).toBe('/');
    expect(Number(lastSet.opts?.maxAge)).toBeGreaterThanOrEqual(30 * 86400);

    const sc = buildSetCookieFromLast();
    expect(sc).toMatch(/HttpOnly/i);
    if (expectSecure) expect(sc).toMatch(/Secure/i);
    else expect(sc).not.toMatch(/Secure/i);
    expect(sc).toMatch(/SameSite=Lax/i);
    expect(sc).toMatch(/Path=\//);
    const maxAge = Number((sc.match(/Max-Age=(\d+)/i) ?? [])[1] ?? 0);
    expect(maxAge).toBeGreaterThanOrEqual(30 * 86400);
  });

  it('logout deletes the session row', async () => {
    const sub = await makeSubscriber('logout@example.com');
    const raw = await createAuthToken(sub.id, 'welcome');
    await verifyGET(makeReq(`http://localhost/api/auth/verify?token=${raw}`));
    const before = await db.select().from(sessions).where(eq(sessions.subscriberId, sub.id));
    expect(before).toHaveLength(1);
    await logoutPOST();
    const after = await db.select().from(sessions).where(eq(sessions.subscriberId, sub.id));
    expect(after).toHaveLength(0);
  });
});
