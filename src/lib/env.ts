import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_PRICE_ID_MENTORIA: z.string().startsWith('price_'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().email(),
  APP_URL: z.string().url(),
  ADMIN_SEED_EMAIL: z.string().email().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
