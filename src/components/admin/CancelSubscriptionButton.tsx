'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm('¿Cancelar al final del período?')) return;
    start(async () => {
      const r = await fetch('/api/admin/cancel-subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      if (r.ok) {
        router.refresh();
        return;
      }
      let message = 'Error al cancelar la suscripción.';
      try {
        const body = await r.json();
        if (typeof body?.message === 'string') message = body.message;
      } catch {
        // fall through to default message
      }
      alert(message);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="border border-red-500/60 text-red-300 px-3 py-1 rounded disabled:opacity-50"
    >
      {pending ? 'Cancelando…' : 'Cancelar suscripción'}
    </button>
  );
}
