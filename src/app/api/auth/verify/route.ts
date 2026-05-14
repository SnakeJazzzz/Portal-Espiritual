import { NextRequest, NextResponse } from 'next/server';
import { consumeAuthToken } from '@/lib/auth-tokens';
import { createSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const env = getEnv();
  const token = req.nextUrl.searchParams.get('token');
  if (!token || token.length < 32) {
    return NextResponse.redirect(`${env.APP_URL}/?auth_error=1`);
  }
  const consumed = await consumeAuthToken(token);
  if (!consumed) {
    return new NextResponse('invalid or expired link', { status: 401 });
  }
  await createSession(consumed.subscriberId);
  const sub = await db.query.subscribers.findFirst({ where: eq(subscribers.id, consumed.subscriberId) });
  if (sub?.role === 'admin') return NextResponse.redirect(`${env.APP_URL}/admin`);
  const needsProfile = !sub?.name || !sub?.instagramHandle || !sub?.dateOfBirth;
  return NextResponse.redirect(`${env.APP_URL}${needsProfile ? '/cuenta/perfil' : '/cuenta'}`);
}
