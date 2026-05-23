import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import StarField from '@/components/StarField';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const ctx = await getSession();
  if (ctx) redirect('/cuenta');

  return (
    <div className="min-h-screen">
      <StarField />
      <main className="relative z-10 px-4 py-16 max-w-md mx-auto">
        <h1 className="text-3xl lg:text-5xl font-heading text-white mb-2 text-center">
          Iniciar sesión
        </h1>
        <p className="text-portal-text/70 text-sm mb-8 text-center">
          Te enviaremos un enlace de acceso a tu correo.
        </p>
        <LoginForm />
      </main>
    </div>
  );
}
