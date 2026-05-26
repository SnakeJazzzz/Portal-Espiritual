import { redirect } from 'next/navigation';
import { requireAuth, isProfileComplete } from '@/lib/auth';
import ProfileForm from '@/components/ProfileForm';

export default async function PerfilPage() {
  const { subscriber } = await requireAuth();
  if (isProfileComplete(subscriber)) redirect('/cuenta');

  return (
    <main className="min-h-screen px-4 py-16 max-w-xl mx-auto">
      <h1 className="text-3xl font-heading text-white mb-4">Completa tu perfil</h1>
      <p className="text-portal-text/80 mb-8">
        Estos datos los necesita Juan Pablo para tu mentoría.
      </p>
      <ProfileForm />
    </main>
  );
}
