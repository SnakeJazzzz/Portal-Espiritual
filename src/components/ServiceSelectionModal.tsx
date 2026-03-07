"use client";

import { useEffect, useRef } from 'react';
import { services } from '@/config/services';

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

  const handleServiceSelect = (calcomEventSlug: string) => {
    onSelect(calcomEventSlug);
    onClose();
  };

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
            Elige tu sesión
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mb-4"></div>

        {/* Service options */}
        <div className="space-y-0">
          {services.map((service, index) => (
            <div key={service.id}>
              <button
                onClick={() => handleServiceSelect(service.calcomEventSlug)}
                className="w-full cursor-pointer py-5 px-4 flex items-center justify-between group hover:bg-white/[0.03] transition-colors rounded-lg"
                aria-label={`Seleccionar ${service.name}`}
              >
                <div className="text-left">
                  <h3 className="text-white font-heading text-lg mb-1">
                    {service.name}
                  </h3>
                  <p className="text-white/80 text-base">
                    {service.duration} · ${service.price} {service.currency}
                  </p>
                </div>
                <span
                  className="text-white/40 group-hover:text-white/70 transition-colors text-xl"
                  aria-hidden="true"
                >
                  →
                </span>
              </button>
              {index < services.length - 1 && (
                <div className="border-b border-white/5"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}