import StarField from '@/components/StarField';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Star Field Background - z-0, fixed */}
      <StarField />

      {/* Test Content - verify stars render behind */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <h1 className="text-6xl font-heading font-bold text-white">
          Portal Espiritual
        </h1>
      </div>
    </div>
  );
}
