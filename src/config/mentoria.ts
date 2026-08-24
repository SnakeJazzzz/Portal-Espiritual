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
    'Encarna tu Divinidad, una mentoria enfocada en ti, en tus metas y tu vision personal, si quieres ayuda para:\n' +
    '- Crecer y manifestar tu visión en redes sociales\n' +
    '- Aprender a comunicarte con el mundo espiritual\n' +
    '- Expandir y explorar tus habilidades supra sensoriales\n' +
    '- Creación Consciente de tu realidad\n\n' +
    'Está Mentoria es para ti, llegaste hasta aquí por una razón!\n\n' +
    'Que incluye?\n' +
    '- 2 sesiones privadas de 30 min al mes\n' +
    '- Acceso a Mensajes directos por Instagram\n' +
    '- Prácticas semanales\n' +
    '- Acompañamiento y guía en tu camino',
  ctaAvailable: 'Suscríbete',
  ctaFull: 'Cupo lleno - únete a la lista de espera',
  productSlug: 'mentoria-1a1',
};
