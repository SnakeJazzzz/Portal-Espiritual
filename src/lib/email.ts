import { Resend } from 'resend';
import { getEnv } from '@/lib/env';

const env = getEnv();
const resend = new Resend(env.RESEND_API_KEY);

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
