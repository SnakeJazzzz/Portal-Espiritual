import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const { subscriber } = await requireAuth();
  const h = await headers();
  const path = h.get('x-pathname') ?? '';
  const needsProfile = !subscriber.name || !subscriber.instagramHandle || !subscriber.dateOfBirth;
  if (needsProfile && !path.endsWith('/cuenta/perfil')) redirect('/cuenta/perfil');
  return <>{children}</>;
}
