'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitWaitlist } from '@/app/mentoria/waitlist-actions';

const initialState = { ok: false, error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-transparent border border-white/60 text-white py-2 px-6 rounded disabled:opacity-50"
    >
      {pending ? 'Enviando…' : 'Únete'}
    </button>
  );
}

export default function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction] = useFormState(submitWaitlist, initialState);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-portal-black border border-white/20 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-heading text-white mb-4">Lista de espera</h2>
        {state.ok ? (
          <p className="text-white">Listo. Te aviso cuando se abra un cupo.</p>
        ) : (
          <form action={formAction} className="space-y-4">
            <label className="block">
              <span className="text-white">Tu correo</span>
              <input
                name="email"
                type="email"
                required
                className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2"
              />
            </label>
            <label className="flex gap-2 items-start text-portal-text/80 text-sm">
              <input name="consent" type="checkbox" required className="mt-1" />
              <span>
                Acepto el{' '}
                <a href="/privacidad" target="_blank" className="underline">
                  aviso de privacidad
                </a>
                .
              </span>
            </label>
            {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="text-portal-text/60">
                Cancelar
              </button>
              <SubmitButton />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
