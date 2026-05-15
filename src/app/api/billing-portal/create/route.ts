import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getEnv } from '@/lib/env';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const { subscriber } = await requireAuth();
  if (!subscriber.stripeCustomerId) {
    return NextResponse.json({ message: 'No tienes una suscripción activa.' }, { status: 400 });
  }
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscriber.stripeCustomerId,
      return_url: `${getEnv().APP_URL}/cuenta`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('billing portal create failed', {
      subscriberId: subscriber.id,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { message: 'El portal de Stripe no está configurado. Avisa a Juan Pablo.' },
      { status: 400 },
    );
  }
}
