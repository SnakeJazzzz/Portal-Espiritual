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
    description: '⁠Divinacion de cartas, un espacio donde interpretare el mensaje del universo acorde a tu pregunta o tu energía a travez de las cartas.',
    calcomEventSlug: 'lectura-de-cartas',
  },
  {
    id: 'divinacion-akashica',
    name: 'Lectura Akashica',
    duration: '30 min',
    price: 500,
    currency: 'MXN',
    description: 'Entraremos en tu Akasha, los registros de tu alma donde interpretare la energía presente en tu campo áurico deliberando el divino mensaje que sea de alineación para ti en este momento.',
    calcomEventSlug: 'divinacion-akashica',
  },
  {
    id: 'uno-a-uno',
    name: 'Divinación',
    duration: '60 min',
    price: 800,
    currency: 'MXN',
    description: 'Un espacio donde hablaremos uno-a-uno, conectaremos con tus ancestros, tus guías, tus ángeles y tu ser superior y abriremos un espacio sagrado para hablar de cualquier tema que sea de tu elección y yo estaré comunicándote los mensajes de tu equipo espiritual.',
    calcomEventSlug: 'uno-a-uno',
  },
];

export interface SiteConfig {
  heroTitle: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  aboutPhoto: string;
  aboutAlt: string;
  aboutTitle: string;
  aboutBio: string;
  instagramUrl: string;
  calcomUsername: string;
}

export const siteConfig: SiteConfig = {
  heroTitle: 'Portal Espiritual',
  heroTitleLine1: 'Portal',
  heroTitleLine2: 'Espiritual',
  heroSubtitle: 'Conecta con tu guía interior',
  aboutPhoto: '/about-photo.svg',
  aboutAlt: 'Foto de perfil',
  aboutTitle: 'Sobre Mí',
  aboutBio: 'Soy una guía espiritual dedicada a acompañarte en tu camino de autoconocimiento.\n\nA través del tarot, los registros akáshicos y sesiones uno a uno, te ayudo a conectar con tu sabiduría interior y encontrar claridad en los momentos que más lo necesitas.\n\nCada sesión es un espacio sagrado de escucha, presencia y transformación.',
  instagramUrl: 'https://www.instagram.com/la_consciencia_colectiva?igsh=Z2o1eHpzc2Z3bXlj',
  calcomUsername: 'portal-espiritual',
};