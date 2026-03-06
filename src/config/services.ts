/**
 * Single source of truth for all editable content on Portal Espiritual
 * All service data, pricing, and site configuration lives here
 */

export interface Service {
  id: string;
  name: string;
  duration: string;
  price: number;
  currency: string;
  description: string;
  calcomEventSlug: string;
}

export const services: Service[] = [
  {
    id: 'lectura-de-cartas',
    name: 'Lectura de Cartas',
    duration: '30 min',
    price: 500,
    currency: 'MXN',
    description: 'Divinación con cartas para interpretar el mensaje del universo que te sirva de guía para ti en este momento.',
    calcomEventSlug: 'lectura-de-cartas',
  },
  {
    id: 'divinacion-akashica',
    name: 'Divinación Akáshica',
    duration: '30 min',
    price: 500,
    currency: 'MXN',
    description: 'Entraremos en tu Akasha, los registros de tu alma para deliberar el mensaje que en este momento sea de asistencia para ti, conectando a tus vidas pasadas, ancestros, equipo espiritual y ser superior.',
    calcomEventSlug: 'divinacion-akashica',
  },
  {
    id: 'uno-a-uno',
    name: 'Uno-a-Uno',
    duration: '60 min',
    price: 800,
    currency: 'MXN',
    description: 'Espacio uno a uno para hablar libremente de cualquier tema. Una conversación consciente donde se abre la posibilidad de conectar con tu equipo espiritual.',
    calcomEventSlug: 'uno-a-uno',
  },
];

export const siteConfig = {
  heroTitle: 'Portal Espiritual',
  heroTitleLine1: 'Portal',
  heroTitleLine2: 'Espiritual',
  heroSubtitle: 'Conecta con tu guía interior',
  aboutPhoto: '/about-photo.svg',
  aboutAlt: 'Foto de perfil',
  aboutTitle: 'Sobre Mí',
  aboutBio: 'Soy una guía espiritual dedicada a acompañarte en tu camino de autoconocimiento.\n\nA través del tarot, los registros akáshicos y sesiones uno a uno, te ayudo a conectar con tu sabiduría interior y encontrar claridad en los momentos que más lo necesitas.\n\nCada sesión es un espacio sagrado de escucha, presencia y transformación.',
  instagramUrl: 'https://www.instagram.com/la_consciencia_colectiva?igsh=Z2o1eHpzc2Z3bXlj',
};