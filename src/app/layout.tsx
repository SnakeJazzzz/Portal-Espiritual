import type { Metadata } from 'next';
import { Josefin_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const josefinSans = Josefin_Sans({
  variable: '--font-heading-next',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  variable: '--font-body-next',
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Portal Espiritual',
  description: 'Servicios espirituales: lecturas, divinación akáshica y sesiones uno a uno. Reserva tu cita.',
};

// Fixed: viewport should be a separate export in Next.js 14+ (not inside metadata)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${josefinSans.variable} ${cormorantGaramond.variable}`}>
      <body className="bg-portal-black text-portal-text font-body antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
