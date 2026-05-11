/**
 * Single source of truth for all editable content on Portal Espiritual
 * All service data, pricing, and site configuration lives here
 */

// Placeholder for new Cal.com event slug - replace this value after creating the event in Cal.com
const CAL_SLUG_ACTIVACION_CUANTICA = "TODO-REPLACE";

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
    name: 'Divinación de Cartas',
    duration: '30 min',
    price: 555,
    currency: 'MXN',
    description: 'Un espacio para hacer cualquier tipo de pregunta, revelar información oculta, entrar en detalle y analizar cualquier situación de vida, todo a través de las cartas.',
    calcomEventSlug: 'lectura-de-cartas',
  },
  {
    id: 'divinacion-akashica',
    name: 'Divinación Akáshica',
    duration: '45 min',
    price: 666,
    currency: 'MXN',
    description: 'Entraremos en tu Akasha, los Registros Universales de tu Alma, donde conectaremos con tus otras vidas, tu misión y propósito de vida, líneas del tiempo para ti, sanar lazos kármicos y revelar cualquier otra información que sea de alineación con tu ser superior, tu historia a través del tiempo y el espacio.',
    calcomEventSlug: 'divinacion-akashica',
  },
  {
    id: 'uno-a-uno',
    name: 'Divinación Clásica',
    duration: '60 min',
    price: 888,
    currency: 'MXN',
    description: 'Un espacio donde hablaremos uno a uno, conectaremos con tu ser superior, tus guías, ángeles, ancestros y cualquier otro ser divino que esté presente, un espacio para preguntar lo que gustes y yo estaré comunicándote cualquier información que sea de alineación para ti en ese momento de parte de tu equipo espiritual. Una lectura completa y profunda con un toque personalizado para ti.',
    calcomEventSlug: 'uno-a-uno',
  },
  {
    id: 'activacion-cuantica',
    name: 'Activación Cuántica',
    duration: '60 min',
    price: 1111,
    currency: 'MXN',
    description: 'Este servicio consta de una activación cuántica de tu poder superior alineado a cualquier aspecto personal de tu elección, meditaremos juntos por 30 minutos donde yo acompañado de tu equipo espiritual estaremos activando tu potencial infinito en cualquier área de tu vida que sea de tu elección. Platicaremos sobre tu intención para esta activación y luego entraremos en la meditación y finalizaremos con un último mensaje de tu equipo espiritual.',
    calcomEventSlug:'activacion-cuantica', 
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
  aboutBio: 'Hola mi nombre es Juan Pablo y soy un mensajero divino y guía espiritual.\n\nMe dedico al camino de la exploración de la consciencia y el autoconocimiento.\n\nFunciono como un puente entre el mundo físico y el mundo espiritual y estoy al servicio de la Humanidad y el Universo.\n\nTe ayudo a conectar con tu esencia, a traer claridad y alineación a tu vida y a encarnar tu versión de mas alta vibración.\n\nTodo momento es divino, con amor JP.',
  instagramUrl: 'https://www.instagram.com/la_consciencia_colectiva?igsh=Z2o1eHpzc2Z3bXlj',
  calcomUsername: 'portal-espiritual',
};