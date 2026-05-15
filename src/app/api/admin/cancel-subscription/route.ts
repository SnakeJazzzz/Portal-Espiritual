import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json();
  const { subscriptionId } = body as { subscriptionId: string };
  const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!row) return NextResponse.json({ message: 'not found' }, { status: 404 });
  await stripe.subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: true });
  return NextResponse.json({ ok: true });
}
