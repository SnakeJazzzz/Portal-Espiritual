import StarField from '@/components/StarField';
import { requireAuth } from '@/lib/auth';

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="min-h-screen">
      <StarField />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
