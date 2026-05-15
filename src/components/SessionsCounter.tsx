export default function SessionsCounter({ remaining }: { remaining: number }) {
  return (
    <div className="text-center my-8">
      <p className="text-5xl font-heading text-white">{remaining} / 2</p>
      <p className="text-portal-text/70">sesiones este mes</p>
    </div>
  );
}
