'use client';

import { siteConfig, services } from '@/config/services';
import ServiceCard from '@/components/ServiceCard';

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20 sm:px-8 sm:py-24 lg:px-16 lg:py-32"
    >
      <div className="max-w-6xl mx-auto w-full">
        {/* Decorative Top Line */}
        <div className="flex justify-center mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="w-16 h-px bg-portal-gold opacity-40" />
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white text-center mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {siteConfig.heroTitle}
        </h1>

        {/* Subtitle */}
        <p className="text-lg lg:text-xl text-portal-text opacity-80 text-center max-w-xl mx-auto mb-20 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          {siteConfig.heroSubtitle}
        </p>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, index) => (
            <div
              key={service.id}
              className={`animate-fade-in-up ${
                index === services.length - 1
                  ? 'md:col-span-2 md:max-w-md md:mx-auto lg:col-span-1 lg:max-w-none'
                  : ''
              }`}
              style={{ animationDelay: `${0.8 + index * 0.2}s` }}
            >
              <ServiceCard service={service} onBook={() => {}} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
