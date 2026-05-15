import { redirect } from 'next/navigation';
import { requireAuth, isProfileComplete } from '@/lib/auth';
import { db } from '@/db/client';
import { subscriptions } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import SessionsCounter from '@/components/SessionsCounter';
import PastDueBanner from '@/components/PastDueBanner';
import InlineEditableField from '@/components/InlineEditableField';
import ManageBillingButton from '@/components/ManageBillingButton';
import { updateSubscriberField } from './actions';

export const dynamic = 'force-dynamic';

export default async function CuentaPage() {
  const { subscriber } = await requireAuth();
  if (!isProfileComplete(subscriber)) redirect('/cuenta/perfil');

  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.subscriberId, subscriber.id),
      inArray(subscriptions.status, ['active', 'past_due']),
    ),
  });

  if (!sub) {
    return (
      <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
        <p className="text-portal-text/80">
          Tu suscripción se está procesando. Refresca en unos segundos.
        </p>
        <form action="/cuenta" method="get" className="mt-4">
          <button className="border border-white/40 text-white px-4 py-2 rounded">Refrescar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
      {sub.status === 'past_due' && <PastDueBanner />}
      <h1 className="text-3xl font-heading text-white">Tu cuenta</h1>
      <SessionsCounter remaining={sub.sessionsRemaining} total={2} />

      <section className="mt-8">
        <h2 className="text-xl font-heading text-white mb-2">Información personal</h2>
        <p className="text-portal-text/70 text-sm mb-4">
          Edita cualquier campo directamente. Los cambios se guardan al dar click en Guardar.
        </p>
        <div className="py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-portal-text/70 text-sm">Email</span>
            <span className="text-portal-text/50 text-xs">(no editable)</span>
          </div>
          <p className="block w-full text-left text-white text-lg mt-1 px-3 py-2 rounded border border-white/10 bg-white/[0.03]">
            {subscriber.email}
          </p>
        </div>
        <InlineEditableField label="Nombre" initialValue={subscriber.name ?? ''} fieldName="name" onSave={updateSubscriberField} />
        <InlineEditableField label="Instagram" initialValue={subscriber.instagramHandle ?? ''} fieldName="instagram_handle" onSave={updateSubscriberField} />
        <InlineEditableField label="Teléfono" initialValue={subscriber.phone ?? ''} fieldName="phone" onSave={updateSubscriberField} />
        <InlineEditableField label="Zona horaria" initialValue={subscriber.timezone} fieldName="timezone" onSave={updateSubscriberField} />
        <InlineEditableField label="Notas para JP" initialValue={subscriber.notesFromSubscriber ?? ''} fieldName="notes_from_subscriber" onSave={updateSubscriberField} />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-heading text-white mb-2">Suscripción</h2>
        <p className="text-portal-text/80">
          Status: <span className="font-semibold">{sub.status}{sub.cancelAtPeriodEnd ? ' (cancela al fin del período)' : ''}</span>
        </p>
        <p className="text-portal-text/80">
          Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString('es-MX')}
        </p>
        <p className="text-portal-text/60 text-sm mt-3">
          Si tienes dudas, escríbele a Juan Pablo por Instagram antes de cancelar.
        </p>
        <div className="mt-3">
          <ManageBillingButton />
        </div>
        <form action="/api/auth/logout" method="post" className="mt-6">
          <button className="text-portal-text/60 text-sm">Cerrar sesión</button>
        </form>
      </section>
    </main>
  );
}
