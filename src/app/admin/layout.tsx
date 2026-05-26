import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-portal-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl">Admin · Portal Espiritual</h1>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="text-sm text-portal-text/60 hover:text-portal-text/90 underline"
          >
            Cerrar sesión
          </button>
        </form>
      </header>
      <div className="px-6 py-8 max-w-5xl mx-auto">{children}</div>
    </div>
  );
}
