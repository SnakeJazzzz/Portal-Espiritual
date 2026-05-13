import MentoriaCard from '@/components/MentoriaCard';
import { mentoriaConfig } from '@/config/mentoria';
import { getCapacity, isFull } from '@/lib/capacity';

export const dynamic = 'force-dynamic';

export default async function MentoriaPage({
  searchParams,
}: { searchParams: Promise<{ checkout?: string }> }) {
  const cap = await getCapacity(mentoriaConfig.productSlug);
  const { checkout } = await searchParams;

  return (
    <main className="min-h-screen px-4 py-16 max-w-2xl mx-auto">
      {checkout === 'canceled' && (
        <p className="mb-8 text-center text-portal-text/80">
          Tu suscripción quedó pendiente. Dale otra vez al botón cuando estés listo.
        </p>
      )}
      <MentoriaCard capacityFull={isFull(cap)} />
    </main>
  );
}
