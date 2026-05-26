'use client';

import { useTransition } from 'react';

export default function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm('¿Cancelar al final del período?')) return;
    start(async () => {
      const r = await fetch('/api/admin/cancel-subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      if (r.ok) window.location.reload();
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
