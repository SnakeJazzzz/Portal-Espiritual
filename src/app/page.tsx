import StarField from '@/components/StarField';
import Hero from '@/components/Hero';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Star Field Background - z-0, fixed */}
      <StarField />

      {/* Main Content */}
      <main className="relative z-10">
        <Hero />
      </main>
    </div>
  );
}
