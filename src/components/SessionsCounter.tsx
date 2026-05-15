export default function SessionsCounter({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div className="text-center my-8">
      <p className="text-5xl font-heading text-white">{remaining} / {total}</p>
      <p className="text-portal-text/70">sesiones este mes</p>
    </div>
  );
}
