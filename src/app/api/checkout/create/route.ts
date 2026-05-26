import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getEnv } from '@/lib/env';
import { getSession } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const env = getEnv();
  const ctx = await getSession();

  // Layer 1 of spec §6.1.1: logged-in subscriber with an active/past_due sub
  // should not be able to start a new checkout — return 409 + redirect to /cuenta.
  // Anonymous users still pass through; webhook layer catches the duplicate.
  if (ctx) {
    const active = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.subscriberId, ctx.subscriber.id),
        inArray(subscriptions.status, ['active', 'past_due']),
      ),
    });
    if (active) {
      return NextResponse.json(
        { message: 'Ya tienes una suscripción activa.', redirect: '/cuenta' },
        { status: 409 },
      );
    }
  }

  // Reuse stripeCustomerId on re-subscription (canceled sub → fresh checkout):
  // keeps payment methods and history attached to the same Stripe customer.
  const customerArg = ctx?.subscriber.stripeCustomerId
    ? { customer: ctx.subscriber.stripeCustomerId }
    : {};

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: env.STRIPE_PRICE_ID_MENTORIA, quantity: 1 }],
    success_url: `${env.APP_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/mentoria?checkout=canceled`,
    automatic_tax: { enabled: false },
    locale: 'es',
    ...customerArg,
  });
  if (!session.url) return NextResponse.json({ message: 'Stripe did not return a URL' }, { status: 500 });
  return NextResponse.json({ url: session.url });
}
