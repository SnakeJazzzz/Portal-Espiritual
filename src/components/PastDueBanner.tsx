'use client';

import { useTransition } from 'react';

export default function PastDueBanner() {
  const [pending, start] = useTransition();
  function openPortal() {
    start(async () => {
      const res = await fetch('/api/billing-portal/create', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const body = await res.json().catch(() => ({}));
        // TODO(Phase 6.5): replace alert with toast
        alert(body.message ?? 'No se pudo abrir el portal. Intenta de nuevo.');
      }
    });
  }
  return (
    <div className="bg-red-900/40 border border-red-500/60 rounded-lg p-4 mb-6">
      <p className="text-red-200 font-semibold">Tu pago falló.</p>
      <p className="text-red-200/80 text-sm mt-1">Actualiza tu tarjeta antes de que se cancele tu suscripción.</p>
      <button onClick={openPortal} disabled={pending}
        className="mt-3 bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50">
        {pending ? 'Abriendo…' : 'Abrir Stripe Customer Portal'}
      </button>
    </div>
  );
}
