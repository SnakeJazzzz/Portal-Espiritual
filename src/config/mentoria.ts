export interface MentoriaConfig {
  title: string;
  priceLabel: string;
  description: string;
  ctaAvailable: string;
  ctaFull: string;
  productSlug: string;
}

export const mentoriaConfig: MentoriaConfig = {
  title: 'Mentoría 1-a-1',
  priceLabel: '$2222 MXN / mes',
  description:
    'Te acompaño en tu proceso de Ascensión. Qué incluye? 2 sesiones privadas al mes de 30 min, acceso a mensajes directos por Insta y un plan personalizado de desarrollo consciente alineado a tu visión. Encarna tu Ser Superior.',
  ctaAvailable: 'Suscríbete',
  ctaFull: 'Cupo lleno - únete a la lista de espera',
  productSlug: 'mentoria-1a1',
};
