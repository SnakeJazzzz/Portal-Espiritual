import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getEnv } from '@/lib/env';
import { db } from '@/db/client';
import { stripeEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { handleCheckoutCompleted } from '@/lib/webhooks/handle-checkout-completed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new NextResponse('missing signature', { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, getEnv().STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new NextResponse(`signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotency: SELECT first, return 200 if already processed.
  const existing = await db.query.stripeEvents.findFirst({
    where: eq(stripeEvents.stripeEventId, event.id),
  });
  if (existing) return NextResponse.json({ received: true, idempotent: true });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      default:
        break;
    }
    // Commit point: insert stripe_events ONLY after all side effects succeeded.
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('webhook handler failed; will be retried by Stripe', {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse('handler error; retry', { status: 500 });
  }
}
