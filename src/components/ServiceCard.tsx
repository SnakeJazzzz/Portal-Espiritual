'use client';

import { siteConfig, type Service } from '@/config/services';
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

        {/* Promo label */}
        {siteConfig.promoActive && (
          <p className="mt-2 text-base lg:text-xl uppercase tracking-widest text-white/70">
            {siteConfig.promoLabel}
          </p>
        )}

        {/* Duration + price list */}
        <ul className="mt-4 space-y-2">
          {service.variants.map((variant) => (
            <li
              key={variant.calcomEventSlug}
              className="flex items-baseline justify-between text-lg lg:text-2xl"
            >
              <span className="text-portal-text/80">{variant.duration}</span>
              {siteConfig.promoActive ? (
                <span className="flex items-baseline gap-3">
                  <s className="text-portal-text/40">
                    ${variant.regularPrice}
                  </s>
                  <span className="text-white font-semibold">
                    ${variant.launchPrice} {service.currency}
                  </span>
                </span>
              ) : (
                <span className="text-portal-text/80">
                  ${variant.regularPrice} {service.currency}
                </span>
              )}
            </li>
          ))}
        </ul>

        {/* Description */}
        <p className="mt-4 text-lg lg:text-2xl text-portal-text/90 leading-relaxed whitespace-pre-line">
          {service.description}
        </p>
      </div>
    </CelestialBorder>
  );
}
