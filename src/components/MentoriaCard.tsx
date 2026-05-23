'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import CelestialBorder from '@/components/CelestialBorder';
import { mentoriaConfig } from '@/config/mentoria';

interface MentoriaCardProps {
  capacityFull: boolean;
  onWaitlistClick?: () => void;
}

export default function MentoriaCard({ capacityFull, onWaitlistClick }: MentoriaCardProps) {
  const [pending, startTransition] = useTransition();

  function handleSubscribe() {
    startTransition(async () => {
      const res = await fetch('/api/checkout/create', { method: 'POST' });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const body = await res.json().catch(() => ({}));
        if (typeof body.redirect === 'string') {
          window.location.href = body.redirect;
          return;
        }
        // TODO(Phase 6.5): replace alert with toast
        alert(body.message ?? 'No se pudo iniciar el checkout. Intenta de nuevo.');
      }
    });
  }

  return (
    <CelestialBorder borderRadius="1rem">
      <div className="bg-white/[0.03] rounded-2xl p-7">
        <h3 className="text-2xl lg:text-4xl font-heading font-semibold text-white">
          {mentoriaConfig.title}
        </h3>
        <p className="mt-2 text-lg lg:text-2xl text-portal-text/80">
          {mentoriaConfig.priceLabel}
        </p>
        <p className="mt-4 text-lg lg:text-2xl text-portal-text/90 leading-relaxed">
          {mentoriaConfig.description}
        </p>
        <div className="mt-6 space-y-3">
          {capacityFull ? (
            <button
              type="button"
              onClick={onWaitlistClick}
              className="w-full bg-transparent border border-white/30 text-white font-heading text-xl lg:text-2xl py-3 px-6 rounded-xl"
            >
              {mentoriaConfig.ctaFull}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={pending}
              className="w-full bg-transparent border border-white/60 text-white font-heading text-xl lg:text-2xl py-3 px-6 rounded-xl disabled:opacity-50"
            >
              {pending ? 'Redirigiendo…' : mentoriaConfig.ctaAvailable}
            </button>
          )}

          {/* Secondary CTA — re-entry for existing subscribers (D-10.9-1) */}
          <Link
            href="/login"
            className="block w-full bg-transparent border border-white/20 text-portal-text/70 font-heading text-xl lg:text-2xl py-3 px-6 rounded-xl text-center hover:text-white hover:border-white/40 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </CelestialBorder>
  );
}
