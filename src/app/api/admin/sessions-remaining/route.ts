import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { appendAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  subscriptionId: z.string().uuid(),
  sessionsRemaining: z.number().int().min(0).max(99),
});

export async function PATCH(req: NextRequest) {
  const { subscriber: admin } = await requireAdmin();
  const body = schema.parse(await req.json());
  const current = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, body.subscriptionId),
  });
  if (!current) return NextResponse.json({ message: 'not found' }, { status: 404 });
  await db
    .update(subscriptions)
    .set({ sessionsRemaining: body.sessionsRemaining, updatedAt: new Date() })
    .where(eq(subscriptions.id, body.subscriptionId));
  await appendAudit({
    adminId: admin.id,
    action: 'set_sessions_remaining',
    targetSubscriberId: current.subscriberId,
    before: { sessionsRemaining: current.sessionsRemaining },
    after: { sessionsRemaining: body.sessionsRemaining },
  });
  return NextResponse.json({ ok: true });
}
