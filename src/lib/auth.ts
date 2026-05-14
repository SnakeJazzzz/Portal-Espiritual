import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { db } from '@/db/client';
import { sessions, subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'pe_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createSession(subscriberId: string) {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id, subscriberId, expiresAt });
  (await cookies()).set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  return id;
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, cookie.value),
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  const subscriber = await db.query.subscribers.findFirst({
    where: eq(subscribers.id, session.subscriberId),
  });
  if (!subscriber) return null;
  const newExpires = new Date(Date.now() + SESSION_TTL_MS);
  await db.update(sessions)
    .set({ lastSeenAt: new Date(), expiresAt: newExpires })
    .where(eq(sessions.id, session.id));
  return { session, subscriber };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (cookie) {
    await db.delete(sessions).where(eq(sessions.id, cookie.value));
    cookieStore.delete(COOKIE_NAME);
  }
}

export async function requireAuth() {
  const ctx = await getSession();
  if (!ctx) redirect('/');
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireAuth();
  if (ctx.subscriber.role !== 'admin') redirect('/');
  return ctx;
}
