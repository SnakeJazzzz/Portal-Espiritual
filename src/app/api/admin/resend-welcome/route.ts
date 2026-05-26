import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { subscriptions, subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { createAuthToken } from '@/lib/auth-tokens';
import { sendWelcomeEmail } from '@/lib/email';
import { getEnv } from '@/lib/env';
import { appendAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ subscriptionId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const { subscriber: admin } = await requireAdmin();
  const env = getEnv();
  const { subscriptionId } = schema.parse(await req.json());

  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!sub) return NextResponse.json({ message: 'not found' }, { status: 404 });

  const recipient = await db.query.subscribers.findFirst({ where: eq(subscribers.id, sub.subscriberId) });
  if (!recipient) return NextResponse.json({ message: 'subscriber missing' }, { status: 404 });

  // Overwrite welcome_email_status to 'pending' before re-send attempt (spec N3).
  await db
    .update(subscriptions)
    .set({ welcomeEmailStatus: 'pending', updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));

  const raw = await createAuthToken(recipient.id, 'welcome');
  const result = await sendWelcomeEmail({
    to: recipient.email,
    magicLinkUrl: `${env.APP_URL}/api/auth/verify?token=${raw}`,
    idempotencyHeader: `resend:${Date.now()}:welcome_email`,
  });

  await db
    .update(subscriptions)
    .set({ welcomeEmailStatus: result.error ? 'failed' : 'sent' })
    .where(eq(subscriptions.id, subscriptionId));

  await appendAudit({
    adminId: admin.id,
    action: 'resend_welcome_email',
    targetSubscriberId: recipient.id,
    after: { sentTo: recipient.email },
  });

  return NextResponse.json({ ok: true, status: result.error ? 'failed' : 'sent' });
}
