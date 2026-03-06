import Image from 'next/image';
import { siteConfig } from '@/config/services';
import CelestialBorder from '@/components/CelestialBorder';

export default function AboutMe() {
  const bioParagraphs = siteConfig.aboutBio.split('\n').filter((p) => p.trim() !== '');

  return (
    <section id="sobre-mi" className="px-6 py-20 lg:px-16 lg:py-32">
      <div className="max-w-5xl mx-auto">
        {/* Two-column layout: photo left, text right on desktop */}
        {/* Stacked layout: text top, photo bottom on mobile (reversed) */}
        <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-16 items-center lg:items-start">
          {/* Photo Column - appears second (bottom) on mobile, left on desktop */}
          <div className="w-full lg:w-auto lg:flex-shrink-0">
            <CelestialBorder borderRadius="1rem">
              {/* Photo with fade gradient overlay - 3:4 aspect ratio portrait */}
              <div
                className="relative w-full lg:w-[380px] aspect-[3/4] rounded-2xl overflow-hidden"
                style={{ backgroundColor: 'rgba(45, 27, 105, 0)' }}
              >
                <Image
                  src={siteConfig.aboutPhoto}
                  alt={siteConfig.aboutAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 380px"
                  className="object-cover"
                />
                {/* Fade gradient overlay at bottom */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-2/5 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, #050510)'
                  }}
                />
              </div>
            </CelestialBorder>
          </div>

          {/* Text Column - appears first (top) on mobile */}
          <div className="flex-1 text-center lg:text-left">
            {/* Heading */}
            <h2 className="text-2xl lg:text-3xl font-heading font-semibold text-white mb-6">
              {siteConfig.aboutTitle}
            </h2>

            {/* Bio paragraphs */}
            <div className="space-y-4 mb-8">
              {bioParagraphs.map((paragraph, index) => (
                <p key={index} className="text-base text-portal-text leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Instagram icon link */}
            <a
              href={siteConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-block text-white/50 hover:text-white transition-colors duration-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4.5"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
