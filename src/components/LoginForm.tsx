'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitLogin } from '@/app/login/actions';

const initialState = { ok: false, error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-transparent border border-white/60 text-white font-heading text-xl py-3 px-6 rounded-xl disabled:opacity-50"
    >
      {pending ? 'Enviando…' : 'Enviar enlace de acceso'}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(submitLogin, initialState);

  if (state.ok) {
    return (
      <p className="text-white text-center">
        Te enviamos un enlace de acceso. Revisá tu inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-portal-text/80 text-sm">Tu correo</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2"
        />
      </label>
      {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
