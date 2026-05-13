import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getEnv } from '@/lib/env';

export async function POST() {
  const env = getEnv();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID_MENTORIA, quantity: 1 }],
    success_url: `${env.APP_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/mentoria?checkout=canceled`,
    automatic_tax: { enabled: false },
    locale: 'es',
  });
  if (!session.url) return NextResponse.json({ message: 'Stripe did not return a URL' }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
