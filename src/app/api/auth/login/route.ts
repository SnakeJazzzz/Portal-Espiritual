import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendLoginLinkEmail } from '@/lib/email';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ email: z.string().email() });

// D3: floor of 800ms gives margin over Resend p99 (~600ms).
// Do not lower without confirmed Resend SLA.
const MIN_RESPONSE_MS = 800;

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || '127.0.0.1';
}

async function delayUntil(targetMs: number): Promise<void> {
  const wait = targetMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const env = getEnv();
  const ip = clientIp(req);

  const rate = await checkRateLimit({
    endpoint: 'auth_login',
    ip,
    windowSeconds: 60,
    maxAttempts: 5,
  });
  if (!rate.allowed) {
    await delayUntil(startedAt + MIN_RESPONSE_MS);
    return new NextResponse('rate limited', { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    await delayUntil(startedAt + MIN_RESPONSE_MS);
    return NextResponse.json({ ok: true });
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const subscriber = await db.query.subscribers.findFirst({
    where: eq(subscribers.email, normalizedEmail),
  });
  if (subscriber) {
    const rawToken = await createAuthToken(subscriber.id, 'login');
    const magicLinkUrl = `${env.APP_URL}/api/auth/verify?token=${rawToken}`;
    await sendLoginLinkEmail({ to: normalizedEmail, magicLinkUrl });
  }

  await delayUntil(startedAt + MIN_RESPONSE_MS);
  return NextResponse.json({ ok: true });
}
