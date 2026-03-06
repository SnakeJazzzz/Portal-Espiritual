'use client';

import { useState } from 'react';
import { siteConfig, services } from '@/config/services';
import ServiceCard from '@/components/ServiceCard';
import CelestialBorder from '@/components/CelestialBorder';
import ConstellationTitle from '@/components/constellation/ConstellationTitle';

export default function Hero() {
  const [animationComplete, setAnimationComplete] = useState(false);

  const handleAnimationComplete = () => {
    setAnimationComplete(true);
  };

  return (
    <section id="hero" className="relative z-10">
      {/* Constellation Section - Full Screen */}
      <div className="min-h-screen flex items-center justify-center px-2 sm:px-6">
        <ConstellationTitle onAnimationComplete={handleAnimationComplete} />
      </div>

      {/* Content Section - Fades in after constellation */}
      <div
        className={`transition-opacity duration-1000 ${
          animationComplete ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Subtitle */}
        <p
          className="text-xl lg:text-4xl text-portal-text/60 text-center max-w-xl mx-auto mb-24 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}
        >
          {siteConfig.heroSubtitle}
        </p>

        {/* Service Cards Grid */}
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {services.map((service, index) => (
              <div
                key={service.id}
                className={`animate-fade-in-up ${
                  index === services.length - 1
                    ? 'md:col-span-2 md:max-w-md md:mx-auto lg:col-span-1 lg:max-w-none'
                    : ''
                }`}
                style={{ animationDelay: `${0.4 + index * 0.2}s` }}
              >
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <div
          className="flex justify-center mt-16 mb-32 px-6 animate-fade-in-up"
          style={{ animationDelay: '1.0s' }}
        >
          <CelestialBorder borderRadius="0.75rem" active={true}>
            <button
              onClick={() => {
                // TODO: Integrate Cal.com booking modal
              }}
              className="bg-transparent text-white font-heading font-medium text-2xl lg:text-4xl py-4 px-12 rounded-xl w-full sm:w-auto"
            >
              Reservar tu sesión
            </button>
          </CelestialBorder>
        </div>
      </div>
    </section>
  );
}
