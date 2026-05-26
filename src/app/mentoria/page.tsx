import StarField from '@/components/StarField';
import MentoriaCardWithWaitlist from '@/components/MentoriaCardWithWaitlist';
import { mentoriaConfig } from '@/config/mentoria';
import { getCapacity, isFull } from '@/lib/capacity';

export const dynamic = 'force-dynamic';

export default async function MentoriaPage({
  searchParams,
}: { searchParams: Promise<{ checkout?: string }> }) {
  const cap = await getCapacity(mentoriaConfig.productSlug);
  const { checkout } = await searchParams;

  return (
    <div className="min-h-screen">
      <StarField />
      <main className="relative z-10 px-4 py-16 max-w-2xl mx-auto">
        {checkout === 'canceled' && (
          <div
            role="status"
            className="mb-8 px-6 py-4 rounded-xl bg-portal-gold/10 border border-portal-gold/30 text-center text-base lg:text-lg text-portal-text"
          >
            <p>
              Tu suscripción quedó pendiente. Dale otra vez al botón cuando estés listo.
            </p>
            <a
              href="/"
              className="inline-block mt-3 text-sm underline text-portal-text/80 hover:text-portal-text"
            >
              Volver al inicio
            </a>
          </div>
        )}
        <MentoriaCardWithWaitlist capacityFull={isFull(cap)} />
      </main>
    </div>
  );
}
