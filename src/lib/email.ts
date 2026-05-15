import { Resend } from 'resend';
import { getEnv } from '@/lib/env';

const env = getEnv();
const resend = new Resend(env.RESEND_API_KEY);

const REFUND_TIMELINE = 'El reembolso suele verse reflejado en 5-10 días hábiles, dependiendo de tu banco. Es automático, no necesitas hacer nada.';

interface WelcomeEmailParams {
  to: string;
  magicLinkUrl: string;
  idempotencyHeader: string;
}

export async function sendWelcomeEmail({ to, magicLinkUrl, idempotencyHeader }: WelcomeEmailParams) {
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: 'Tu acceso a Portal Espiritual — Mentoría 1-a-1',
    html: welcomeHtml(magicLinkUrl),
    text: welcomeText(magicLinkUrl),
    headers: { 'X-Idempotency-Key': idempotencyHeader },
  });
}

interface TransactionalEmailParams {
  to: string;
  idempotencyHeader: string;
}

export async function sendRaceConditionEmail({ to, idempotencyHeader }: TransactionalEmailParams) {
  const waitlistUrl = `${env.APP_URL}/mentoria?email=${encodeURIComponent(to)}`;
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: 'Tu suscripción a Mentoría no pudo completarse',
    html: raceConditionHtml(waitlistUrl),
    text: raceConditionText(waitlistUrl),
    headers: { 'X-Idempotency-Key': idempotencyHeader },
  });
}

export async function sendDuplicateSubscriptionEmail({ to, idempotencyHeader }: TransactionalEmailParams) {
  const accountUrl = `${env.APP_URL}/cuenta`;
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to,
    subject: 'Ya tienes una suscripción activa',
    html: duplicateSubscriptionHtml(accountUrl),
    text: duplicateSubscriptionText(accountUrl),
    headers: { 'X-Idempotency-Key': idempotencyHeader },
  });
}

function welcomeHtml(url: string): string {
  return `
<!doctype html><html lang="es"><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
<h1 style="font-size: 24px;">Bienvenide a tu Mentoría 1-a-1</h1>
<p style="font-size: 16px; line-height: 1.5;">Tu suscripción está activa. Para entrar a tu panel y completar tu perfil, abre este enlace:</p>
<p style="margin: 24px 0;"><a href="${url}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Abrir mi panel</a></p>
<p style="font-size: 14px; color: #666;">Este enlace es válido por 7 días y solo puede usarse una vez.</p>
<p style="font-size: 14px; color: #666;">Si no fuiste tú quien se suscribió, escríbele a Juan Pablo por Instagram.</p>
</body></html>`;
}

function welcomeText(url: string): string {
  return `Bienvenide a tu Mentoría 1-a-1.\n\nAbre este enlace para entrar a tu panel:\n${url}\n\nVálido por 7 días, solo se puede usar una vez.`;
}

function raceConditionHtml(waitlistUrl: string): string {
  return `
<!doctype html><html lang="es"><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
<h1 style="font-size: 24px;">Lo siento, el último cupo ya estaba tomado</h1>
<p style="font-size: 16px; line-height: 1.5;">Tu pago llegó casi al mismo tiempo que el de otra persona, y solo había un lugar libre. Te ofrezco una disculpa: esto no debería pasar y entiendo la frustración.</p>
<p style="font-size: 16px; line-height: 1.5;">Ya te devolví los $2222 MXN de forma automática. ${REFUND_TIMELINE}</p>
<p style="font-size: 16px; line-height: 1.5;">Si quieres entrar cuando se abra un cupo, déjame tu correo en la lista de espera. Te aviso cuando haya.</p>
<p style="margin: 24px 0;"><a href="${waitlistUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Unirme a la lista de espera</a></p>
<p style="font-size: 16px; line-height: 1.5;">Con amor,<br>JP.</p>
</body></html>`;
}

function raceConditionText(waitlistUrl: string): string {
  return `Lo siento, el último cupo ya estaba tomado.

Tu pago llegó casi al mismo tiempo que el de otra persona, y solo había un lugar libre. Te ofrezco una disculpa.

Ya te devolví los $2222 MXN de forma automática. ${REFUND_TIMELINE}

Si quieres entrar cuando se abra un cupo, déjame tu correo en la lista de espera:
${waitlistUrl}

Con amor,
JP.`;
}

function duplicateSubscriptionHtml(accountUrl: string): string {
  return `
<!doctype html><html lang="es"><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
<h1 style="font-size: 24px;">Ya tienes una suscripción activa</h1>
<p style="font-size: 16px; line-height: 1.5;">Vi que ya tienes una suscripción activa a Mentoría 1-a-1 con este correo. Por eso no creé una segunda.</p>
<p style="font-size: 16px; line-height: 1.5;">Ya te devolví los $2222 MXN del segundo cargo de forma automática. ${REFUND_TIMELINE}</p>
<p style="font-size: 16px; line-height: 1.5;">Puedes administrar tu suscripción existente desde tu panel:</p>
<p style="margin: 24px 0;"><a href="${accountUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Abrir mi panel</a></p>
<p style="font-size: 14px; color: #666;">Si crees que esto es un error, escríbeme por Instagram.</p>
<p style="font-size: 16px; line-height: 1.5;">Con amor,<br>JP.</p>
</body></html>`;
}

function duplicateSubscriptionText(accountUrl: string): string {
  return `Ya tienes una suscripción activa.

Vi que ya tienes una suscripción activa a Mentoría 1-a-1 con este correo. Por eso no creé una segunda.

Ya te devolví los $2222 MXN del segundo cargo de forma automática. ${REFUND_TIMELINE}

Puedes administrar tu suscripción existente desde tu panel:
${accountUrl}

Si crees que esto es un error, escríbeme por Instagram.

Con amor,
JP.`;
}
