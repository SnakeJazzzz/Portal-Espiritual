import ProfileForm from '@/components/ProfileForm';

export default function PerfilPage() {
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
