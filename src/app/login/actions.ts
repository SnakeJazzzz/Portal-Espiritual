'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { getEnv } from '@/lib/env';

const schema = z.object({ email: z.string().email() });

export async function submitLogin(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = schema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { ok: false, error: 'Ingresá un email válido.' };
  }

  const hdrs = await headers();
  const xff = hdrs.get('x-forwarded-for');
  const env = getEnv();

  // Forward x-forwarded-for so /api/auth/login sees the user's real IP,
  // not the loopback IP of this server action — required for the per-IP
  // rate limit (S8) to function correctly. Without forwarding, every
  // form submission from any user would share the same rate-limit bucket.
  try {
    await fetch(`${env.APP_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(xff ? { 'x-forwarded-for': xff } : {}),
      },
      body: JSON.stringify({ email: parsed.data.email.toLowerCase() }),
    });
  } catch (err) {
    console.error('login fetch failed', err);
  }

  // Always return ok:true to preserve the no-leak contract of S8: the
  // user can never tell from the UI whether their email is registered,
  // whether they were rate-limited, or whether an internal fetch failed.
  return { ok: true, error: null };
}
