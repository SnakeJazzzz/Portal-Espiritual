'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ResendWelcomeButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  function onClick() {
    start(async () => {
      const r = await fetch('/api/admin/resend-welcome', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const body = await r.json();
      setMsg(r.ok ? `Estado: ${body.status}` : `Error: ${body.message ?? 'unknown'}`);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="border border-white/40 text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {pending ? 'Enviando…' : 'Reenviar welcome email'}
      </button>
      {msg && <span className="text-sm text-portal-text/70">{msg}</span>}
    </div>
  );
}
