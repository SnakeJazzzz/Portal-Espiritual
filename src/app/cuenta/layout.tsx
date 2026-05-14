import { requireAuth } from '@/lib/auth';

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
