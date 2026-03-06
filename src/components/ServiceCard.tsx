'use client';

import type { Service } from '@/config/services';
import CelestialBorder from '@/components/CelestialBorder';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <CelestialBorder borderRadius="1rem">
      <div className="bg-white/[0.03] rounded-2xl p-7">
        {/* Service Name */}
        <h3 className="text-2xl lg:text-4xl font-heading font-semibold text-white">
          {service.name}
        </h3>

        {/* Duration and Price */}
        <div className="flex items-center gap-2 text-lg lg:text-2xl mt-3">
          <span className="text-portal-text/80">{service.duration}</span>
          <span className="text-portal-text/90">•</span>
          <span className="text-portal-text/80">
            $<span className="text-portal-text/70">{service.price}</span>{' '}
            {service.currency}
          </span>
        </div>

        {/* Description */}
        <p className="mt-4 text-lg lg:text-2xl text-portal-text/90 leading-relaxed">
          {service.description}
        </p>
      </div>
    </CelestialBorder>
  );
}
