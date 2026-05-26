import StarField from '@/components/StarField';

export default function GraciasPage() {
  return (
    <div className="min-h-screen">
      <StarField />
      <main className="relative z-10 px-4 py-16 max-w-xl mx-auto text-center">
        <h1 className="text-3xl lg:text-5xl font-heading text-white mb-6">Pago recibido</h1>
        <p className="text-lg lg:text-2xl text-portal-text/80">
          En segundos te llega un correo con tu acceso. Revisa tu bandeja de entrada
          (y spam, por si acaso).
        </p>
      </main>
    </div>
  );
}
