import MentoriaCardWithWaitlist from '@/components/MentoriaCardWithWaitlist';
import { mentoriaConfig } from '@/config/mentoria';
import { getCapacity, isFull } from '@/lib/capacity';

export default async function MentoriaHomeSection() {
  const cap = await getCapacity(mentoriaConfig.productSlug);
  return (
    <section className="relative z-10 py-24 px-6 max-w-2xl mx-auto">
      <MentoriaCardWithWaitlist capacityFull={isFull(cap)} />
    </section>
  );
}
