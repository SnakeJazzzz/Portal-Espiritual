import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { subscribers, subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import SessionsRemainingEditor from '@/components/admin/SessionsRemainingEditor';
import CancelSubscriptionButton from '@/components/admin/CancelSubscriptionButton';
import ResendWelcomeButton from '@/components/admin/ResendWelcomeButton';

export const dynamic = 'force-dynamic';

export default async function SubscriberDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subscriber = await db.query.subscribers.findFirst({ where: eq(subscribers.id, id) });
  if (!subscriber) notFound();

  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.subscriberId, subscriber.id),
      inArray(subscriptions.status, ['active', 'past_due']),
    ),
  });

  return (
    <div className="space-y-6">
      <a href="/admin" className="text-sm underline">
        ← Lista
      </a>
      <h2 className="text-xl font-heading">Suscriptor: {subscriber.name ?? '—'}</h2>

      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-portal-text/60">Email</dt>
        <dd>{subscriber.email}</dd>
        <dt className="text-portal-text/60">Instagram</dt>
        <dd>{subscriber.instagramHandle ?? '—'}</dd>
        <dt className="text-portal-text/60">Fecha de nacimiento</dt>
        <dd>{subscriber.dateOfBirth ?? '—'}</dd>
        <dt className="text-portal-text/60">Teléfono</dt>
        <dd>{subscriber.phone ?? '—'}</dd>
        <dt className="text-portal-text/60">Zona horaria</dt>
        <dd>{subscriber.timezone}</dd>
        <dt className="text-portal-text/60">Notas (de la persona)</dt>
        <dd className="whitespace-pre-wrap">{subscriber.notesFromSubscriber ?? '—'}</dd>
      </dl>

      {sub ? (
        <section className="border-t border-white/10 pt-4 space-y-3">
          <h3 className="text-lg">Suscripción activa</h3>
          <p>
            Status: {sub.status}
            {sub.cancelAtPeriodEnd ? ' (cancela al fin del período)' : ''}
          </p>
          <p>Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}</p>
          <p>Welcome email: {sub.welcomeEmailStatus}</p>
          <div className="flex items-center gap-3">
            <span>Sesiones restantes:</span>
            <SessionsRemainingEditor subscriptionId={sub.id} initial={sub.sessionsRemaining} />
          </div>
          <div className="flex flex-wrap gap-3">
            <CancelSubscriptionButton subscriptionId={sub.id} />
            <ResendWelcomeButton subscriptionId={sub.id} />
            {subscriber.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${subscriber.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-portal-text/80"
              >
                Ver en Stripe Dashboard ↗
              </a>
            )}
          </div>
        </section>
      ) : (
        <p className="text-portal-text/70">Sin suscripción activa.</p>
      )}
    </div>
  );
}
