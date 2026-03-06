import { siteConfig } from '@/config/services';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 py-10 px-6 text-center">
      {/* Site Name */}
      <p className="text-sm text-white/40 font-heading">{siteConfig.heroTitle}</p>

      {/* Spacer */}
      <div className="my-4" />

      {/* Instagram Icon Link */}
      <a
        href={siteConfig.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="inline-block text-white/40 hover:text-white/80 transition-colors duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
          <circle cx="12" cy="12" r="4.5"/>
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
        </svg>
      </a>

      {/* Copyright */}
      <p className="text-xs text-white/25 mt-6">
        © {new Date().getFullYear()} Portal Espiritual. Todos los derechos reservados.
      </p>
    </footer>
  );
}