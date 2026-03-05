'use client';

import type { Service } from '@/config/services';

interface ServiceCardProps {
  service: Service;
  onBook?: () => void;
}

export default function ServiceCard({ service, onBook }: ServiceCardProps) {
  return (
    <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-8 flex flex-col transition-all duration-300 hover:bg-white/[0.06] hover:shadow-[0_0_30px_rgba(201,168,76,0.08)]">
      {/* Service Name */}
      <h3 className="text-xl font-heading font-semibold text-white">
        {service.name}
      </h3>

      {/* Decorative Divider */}
      <div className="mt-3 mb-4">
        <div className="w-8 h-px bg-portal-gold opacity-40" />
      </div>

      {/* Duration and Price */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-portal-text/60">{service.duration}</span>
        <span className="text-portal-text/40">•</span>
        <span className="text-portal-text/60">
          $<span className="text-portal-gold font-medium">{service.price}</span>{' '}
          {service.currency}
        </span>
      </div>

      {/* Description */}
      <p className="mt-4 text-base text-portal-text/80 leading-relaxed">
        {service.description}
      </p>

      {/* Reservar Button */}
      <button
        onClick={onBook}
        className="mt-auto pt-6 w-full bg-portal-gold text-portal-black font-heading font-semibold py-3 rounded-xl transition-all duration-300 ease-out hover:brightness-110 hover:scale-[1.02]"
      >
        Reservar
      </button>
    </div>
  );
}
