'use client';

import { useTransition } from 'react';

export default function ManageBillingButton() {
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
    <button
      type="button"
      onClick={openPortal}
      disabled={pending}
      className="border border-white/40 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      {pending ? 'Abriendo…' : 'Administrar pago / suscripción'}
    </button>
  );
}
