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
    <table className="w-full text-left text-base">
      <thead className="text-portal-text/60 text-sm">
        <tr>
          <th className="pb-3 pr-3">Nombre</th>
          <th className="pb-3 pr-3">Email</th>
          <th className="pb-3 pr-3">Fecha inicio</th>
          <th className="pb-3 pr-3">Sesiones</th>
          <th className="pb-3 pr-3">Status</th>
          <th className="pb-3">Detalle</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.subscriberId} className="border-t border-white/20">
            <td className="py-3 pr-3">
              <Link href={`/admin/${r.subscriberId}`} className="underline">
                {r.name ?? '—'}
              </Link>
            </td>
            <td className="py-3 pr-3">{r.email}</td>
            <td className="py-3 pr-3">{r.createdAt.toLocaleDateString('es-MX')}</td>
            <td className="py-3 pr-3">{r.sessionsRemaining}</td>
            <td className="py-3 pr-3">
              {r.status}
              {r.cancelAtPeriodEnd ? ' (cancela)' : ''}
            </td>
            <td className="py-3">
              <Link
                href={`/admin/${r.subscriberId}`}
                className="underline text-portal-text/80 hover:text-portal-text"
              >
                Ver detalle →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
