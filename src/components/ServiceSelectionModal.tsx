"use client";

import { useEffect, useRef } from 'react';
import { services, siteConfig } from '@/config/services';

interface ServiceSelectionModalProps {
  isOpen: boolean;
  onSelect: (eventSlug: string) => void;
  onClose: () => void;
}

export default function ServiceSelectionModal({
  isOpen,
  onSelect,
  onClose
}: ServiceSelectionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus trap - focus first focusable element when modal opens
      firstFocusableRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVariantSelect = (calcomEventSlug: string) => {
    onSelect(calcomEventSlug);
    onClose();
  };

  // Catálogo actual: un solo servicio (Divinación); el selector elige duración
  const variantRows = services.flatMap((service) =>
    service.variants.map((variant) => ({ service, variant })),
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="max-w-lg w-full mx-auto bg-portal-black border border-white/10 rounded-2xl p-8 relative animate-fade-in-up"
        style={{
          animation: 'fade-in-up 0.3s ease-out both'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          ref={firstFocusableRef}
          onClick={onClose}
          className="absolute top-2 right-6 text-white/70 hover:text-white transition-colors text-5xl leading-none p-2"
          aria-label="Cerrar modal"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <p
            id="modal-title"
            className="text-xl uppercase tracking-widest text-white/70"
          >
            Elige la duración
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-4"></div>

        {/* Duration options */}
        <div className="space-y-0">
          {variantRows.map(({ service, variant }, index) => (
            <div key={variant.calcomEventSlug}>
              <button
                onClick={() => handleVariantSelect(variant.calcomEventSlug)}
                className="w-full cursor-pointer py-5 px-4 flex items-center justify-between group hover:bg-white/[0.03] transition-colors rounded-lg"
                aria-label={`Seleccionar ${service.name} de ${variant.duration}`}
              >
                <div className="text-left">
                  <h3 className="text-white font-heading text-lg mb-1">
                    {service.name} · {variant.duration}
                  </h3>
                  <p className="text-white/80 text-base">
                    {siteConfig.promoActive ? (
                      <>
                        <s className="text-white/40">${variant.regularPrice}</s>{' '}
                        <span className="text-white">
                          ${variant.launchPrice} {service.currency}
                        </span>
                      </>
                    ) : (
                      <>
                        ${variant.regularPrice} {service.currency}
                      </>
                    )}
                  </p>
                </div>
                <span
                  className="text-white/40 group-hover:text-white/70 transition-colors text-xl"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
              {index < variantRows.length - 1 && (
                <div className="border-b border-white/5"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}