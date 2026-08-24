/**
 * Single source of truth for all editable content on Portal Espiritual
 * All service data, pricing, and site configuration lives here
 *
 * ── Fin de la promoción de lanzamiento (procedimiento completo) ──────────
 * Los event types de Cal.com cobran el launchPrice (precio efectivo).
 * El regularPrice tachado es solo display en nuestra card. Hay DOS fuentes
 * de precio (este config + Cal.com), así que el día que JP pida terminar
 * la promo hay que hacer AMBOS pasos:
 *   1. Poner `promoActive: false` en siteConfig (la card pasa a mostrar
 *      solo el regularPrice).
 *   2. Actualizar el precio de los 3 event types en Cal.com
 *      (divinacion-15/30/60) al regularPrice correspondiente.
 *   3. Deploy.
 * Si se hace solo el paso 1, Cal.com sigue cobrando el precio de promo.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface ServiceVariant {
  duration: string;          // "15 min"
  regularPrice: number;      // precio mostrado tachado durante la promo
  launchPrice: number;       // precio efectivo cobrado (= precio en Cal.com)
  calcomEventSlug: string;   // "divinacion-15"
}

export interface Service {
  id: string;
  name: string;
  currency: string;
  description: string;
  variants: ServiceVariant[];
}

export const services: Service[] = [
  {
    id: 'divinacion',
    name: 'Divinación',
    currency: 'MXN',
    description:
      'Durante tu sesión abriremos un Espacio Sagrado donde hablaremos uno-a-uno, conectando con tu Espíritu y transmitiendo el mensaje de la Divinidad para ti en este momento. Un espacio donde conectaremos con tus Guías Espirituales, Ancestros, Angeles, Seres Divinos y tu Ser Superior, para que tu puedas preguntar y conectar con el mensaje que tiene tu Equipo Espiritual para ti.\n\nSi tu intención es entrar a tus Registros Akashicos, conectar con el mensaje Divino de tu Ser Superior, recibir consejo de tus Guías para tu camino, descubrir tus dones espirituales, recibir aclaración y información sobre tu misión y propósito aquí en la tierra, este es el espacio perfecto para ti.',
    variants: [
      {
        duration: '15 min',
        regularPrice: 888,
        launchPrice: 444,
        calcomEventSlug: 'divinacion-15',
      },
      {
        duration: '30 min',
        regularPrice: 1555,
        launchPrice: 777,
        calcomEventSlug: 'divinacion-30',
      },
      {
        duration: '60 min',
        regularPrice: 2222,
        launchPrice: 1111,
        calcomEventSlug: 'divinacion-60',
      },
    ],
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
  promoActive: boolean;      // true = regularPrice tachado + launchPrice
                             // false = solo regularPrice (ver procedimiento arriba)
  promoLabel: string;
}

export const siteConfig: SiteConfig = {
  heroTitle: 'Portal Espiritual',
  heroTitleLine1: 'Portal',
  heroTitleLine2: 'Espiritual',
  heroSubtitle: 'Conecta con tu guía interior',
  aboutPhoto: '/about-photo.svg',
  aboutAlt: 'Foto de perfil',
  aboutTitle: 'Sobre Mí',
  aboutBio: 'Hola mi nombre es Juan Pablo mucho gusto ❤️\n\nYo me dedico a la exploración de la consciencia, el autoconocimiento y estoy al servicio del Universo 🙏🏻\n\nA través de mi despertar aprendí a comunicarme con el mundo espiritual, re conectándome con mi esencia Divina y recordando quién soy, abrazando la experiencia terrenal 🌎\n\nLo más importante para mí es amarse a uno mismo y des de ese Amor Divino que cultivamos en nuestro interior compartirlo con el mundo y paso a pasito crearemos un mundo en unidad donde hay espacio para todos y todo 🌀\n\nViviendo mi misión Divina en esta tierra ✨',
  instagramUrl: 'https://www.instagram.com/la_consciencia_colectiva?igsh=Z2o1eHpzc2Z3bXlj',
  calcomUsername: 'portal-espiritual',
  promoActive: true,
  promoLabel: '50% off por tiempo limitado',
};
