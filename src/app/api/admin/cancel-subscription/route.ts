import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { appendAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { subscriber: admin } = await requireAdmin();
  const body = await req.json();
  const { subscriptionId } = body as { subscriptionId: string };
  const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.id, subscriptionId) });
  if (!row) return NextResponse.json({ message: 'not found' }, { status: 404 });

  // Step A: tell Stripe. Stripe is the source of truth — if this throws, nothing happens locally.
  await stripe.subscriptions.update(row.stripeSubscriptionId, { cancel_at_period_end: true });

  // Step B: optimistic local mirror. If this fails, the webhook will eventually
  // compensate (idempotent), but the UI won't reflect the cancel on the first
  // click. Surface a 500 with a Spanish message + audit_log entry so JP knows
  // to refresh manually in a few seconds.
  try {
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.id, subscriptionId));
  } catch (err) {
    const dbErrorMessage = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[admin-cancel] post-Stripe DB write failed for stripeSubscriptionId=${row.stripeSubscriptionId}: ${dbErrorMessage}\n`,
    );
    await appendAudit({
      adminId: admin.id,
      action: 'cancel_subscription_db_write_failed',
      targetSubscriberId: row.subscriberId,
      after: { stripeSubscriptionId: row.stripeSubscriptionId, dbError: dbErrorMessage },
    });
    return NextResponse.json(
      {
        message:
          'Suscripción cancelada en Stripe pero hubo un error al actualizar el panel. Se reflejará en unos segundos.',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
