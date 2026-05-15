import { vi } from 'vitest';

interface SentEmail { to: string; subject: string; html: string; text: string; headers: Record<string, string>; }
export const sentEmails: SentEmail[] = [];

interface WelcomeParams { to: string; magicLinkUrl: string; idempotencyHeader: string; }
interface TransactionalParams { to: string; idempotencyHeader: string; }

vi.mock('@/lib/email', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/email')>();
  return {
    ...orig,
    sendWelcomeEmail: vi.fn(async (params: WelcomeParams) => {
      sentEmails.push({
        to: params.to,
        subject: 'Tu acceso a Portal Espiritual — Mentoría 1-a-1',
        html: 'mocked',
        text: 'mocked',
        headers: { 'X-Idempotency-Key': params.idempotencyHeader },
      });
      return { data: { id: `re_mock_${Date.now()}` }, error: null };
    }),
    sendRaceConditionEmail: vi.fn(async (params: TransactionalParams) => {
      sentEmails.push({
        to: params.to,
        subject: 'Tu suscripción a Mentoría no pudo completarse',
        html: 'mocked',
        text: 'mocked',
        headers: { 'X-Idempotency-Key': params.idempotencyHeader },
      });
      return { data: { id: `re_mock_${Date.now()}` }, error: null };
    }),
    sendDuplicateSubscriptionEmail: vi.fn(async (params: TransactionalParams) => {
      sentEmails.push({
        to: params.to,
        subject: 'Ya tienes una suscripción activa',
        html: 'mocked',
        text: 'mocked',
        headers: { 'X-Idempotency-Key': params.idempotencyHeader },
      });
      return { data: { id: `re_mock_${Date.now()}` }, error: null };
    }),
  };
});

export function resetSentEmails() { sentEmails.length = 0; }
