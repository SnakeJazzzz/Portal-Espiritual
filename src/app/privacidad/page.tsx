export const PRIVACY_VERSION = '2026-05-13';

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-4 py-16 max-w-3xl mx-auto text-portal-text/90">
      <h1 className="text-3xl lg:text-5xl font-heading text-white mb-6">Aviso de Privacidad</h1>
      <p className="text-sm text-portal-text/60 mb-8">Versión: {PRIVACY_VERSION}</p>

      <section className="space-y-4 text-lg leading-relaxed">
        <p>
          Portal Espiritual (&quot;nosotros&quot;) es responsable del tratamiento de tus datos
          personales conforme a la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (LFPDPPP) y su Reglamento.
        </p>
        <h2 className="text-2xl font-heading text-white mt-8">Datos que recolectamos</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Correo electrónico (necesario para tu cuenta y para enviarte tus accesos)</li>
          <li>Nombre completo, Instagram, fecha de nacimiento (suscriptores de mentoría)</li>
          <li>Teléfono, zona horaria, notas opcionales</li>
          <li>Información de pago: vive solamente en Stripe, nunca en nuestra base de datos</li>
        </ul>
        <h2 className="text-2xl font-heading text-white mt-8">Finalidades</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Procesar tu suscripción y darte acceso a los servicios contratados</li>
          <li>Comunicarnos contigo sobre tu cuenta o suscripción</li>
          <li>Cumplir obligaciones legales y fiscales aplicables</li>
        </ul>
        <h2 className="text-2xl font-heading text-white mt-8">Tus derechos ARCO</h2>
        <p>
          Tienes derecho a Acceso, Rectificación, Cancelación y Oposición sobre tus datos.
          Para ejercerlos, escríbenos a <a className="underline" href="mailto:hola@portalespiritual.com.mx">hola@portalespiritual.com.mx</a>.
        </p>
        <h2 className="text-2xl font-heading text-white mt-8">Contacto</h2>
        <p>
          Juan Pablo — guía espiritual y responsable del tratamiento.
        </p>
      </section>
    </main>
  );
}
