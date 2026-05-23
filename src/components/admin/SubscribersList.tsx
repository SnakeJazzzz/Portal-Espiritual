import Link from 'next/link';

interface Row {
  subscriberId: string;
  name: string | null;
  email: string;
  createdAt: Date;
  sessionsRemaining: number;
  status: string;
  cancelAtPeriodEnd: boolean;
}

export default function SubscribersList({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="text-portal-text/60 text-sm">Sin suscriptores en esta vista.</p>;
  }
  return (
    <table className="w-full text-left">
      <thead className="text-portal-text/60 text-sm">
        <tr>
          <th className="pb-2">Nombre</th>
          <th className="pb-2">Email</th>
          <th className="pb-2">Fecha inicio</th>
          <th className="pb-2">Sesiones</th>
          <th className="pb-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.subscriberId} className="border-t border-white/10">
            <td className="py-2">
              <Link href={`/admin/${r.subscriberId}`} className="underline">
                {r.name ?? '—'}
              </Link>
            </td>
            <td>{r.email}</td>
            <td>{r.createdAt.toLocaleDateString('es-MX')}</td>
            <td>{r.sessionsRemaining}</td>
            <td>
              {r.status}
              {r.cancelAtPeriodEnd ? ' (cancela)' : ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
