/**
 * Single source of truth for all editable content on Portal Espiritual
 * All service data, pricing, and site configuration lives here
 */

export interface Service {
  id: string;
  name: string;
  emoji: string;
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
    emoji: '=.',
    duration: '30 min',
    price: 500,
    currency: 'MXN',
    description: 'Divinaci�n con cartas para interpretar el mensaje del universo que te sirva de gu�a para ti en este momento.',
    calcomEventSlug: 'lectura-de-cartas',
  },
  {
    id: 'divinacion-akashica',
    name: 'Divinaci�n Ak�shica',
    emoji: '<',
    duration: '30 min',
    price: 500,
    currency: 'MXN',
    description: 'Entraremos en tu Akasha, los registros de tu alma para deliberar el mensaje que en este momento sea de asistencia para ti, conectando a tus vidas pasadas, ancestros, equipo espiritual y ser superior.',
    calcomEventSlug: 'divinacion-akashica',
  },
  {
    id: 'uno-a-uno',
    name: 'Uno-a-Uno',
    emoji: '>',
    duration: '60 min',
    price: 800,
    currency: 'MXN',
    description: 'Espacio uno a uno para hablar libremente de cualquier tema. Una conversaci�n consciente donde se abre la posibilidad de conectar con tu equipo espiritual.',
    calcomEventSlug: 'uno-a-uno',
  },
];

export const siteConfig = {
  heroTitle: 'Portal Espiritual',
  heroSubtitle: 'Conecta con tu gu�a interior',
  aboutMe: {
    photo: '/about-photo.jpg',
    text: 'Placeholder text for about me section',
  },
  instagram: 'https://instagram.com/placeholder',
};
