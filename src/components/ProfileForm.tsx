'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitProfile } from '@/app/cuenta/perfil/actions';

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-transparent border border-white/60 text-white font-heading text-xl py-3 px-6 rounded-xl disabled:opacity-50">
      {pending ? 'Guardando…' : 'Continuar'}
    </button>
  );
}

export default function ProfileForm() {
  const [state, formAction] = useActionState(submitProfile, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="text-white">Nombre completo *</span>
        <input name="name" required className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Instagram handle *</span>
        <input name="instagram_handle" required className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Fecha de nacimiento *</span>
        <input name="date_of_birth" type="date" required className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Teléfono / WhatsApp (opcional)</span>
        <input name="phone" className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Zona horaria</span>
        <input name="timezone" defaultValue="America/Mexico_City" className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      <label className="block">
        <span className="text-white">Notas / contexto para JP (opcional)</span>
        <textarea name="notes_from_subscriber" rows={3} className="block w-full mt-1 bg-white/[0.05] text-white rounded px-3 py-2" />
      </label>
      {state.error && <p className="text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
