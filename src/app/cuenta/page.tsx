import { redirect } from 'next/navigation';
import { requireAuth, isProfileComplete } from '@/lib/auth';

export default async function CuentaPage() {
  const { subscriber } = await requireAuth();
  if (!isProfileComplete(subscriber)) redirect('/cuenta/perfil');

  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
      <h1 className="text-3xl font-heading text-white">Tu cuenta</h1>
      <p className="mt-4 text-portal-text/80">Dashboard llega en Slice 5.</p>
    </main>
  );
}
