'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { products, waitlist } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PRIVACY_VERSION } from '@/app/privacidad/page';

const schema = z.object({
  email: z.string().email(),
  consent: z.literal('on'),  // checkbox must be checked
});

export async function submitWaitlist(
  _prev: { ok: boolean; error: string | null },
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    consent: formData.get('consent') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: 'Por favor escribe un correo válido y acepta el aviso de privacidad.' };
  }

  const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
  if (!product) return { ok: false, error: 'No se pudo encontrar el producto.' };

  await db.insert(waitlist).values({
    email: parsed.data.email.toLowerCase(),
    productId: product.id,
    consentPrivacyAt: new Date(),
    consentPrivacyVersion: PRIVACY_VERSION,
  });

  return { ok: true, error: null };
}
