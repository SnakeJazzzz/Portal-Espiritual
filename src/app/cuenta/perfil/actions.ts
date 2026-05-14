'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

const profileSchema = z.object({
  name: z.string().min(1).max(200),
  instagram_handle: z.string().min(1).max(60),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.string().max(40).optional().or(z.literal('')),
  timezone: z.string().min(1).max(60),
  notes_from_subscriber: z.string().max(2000).optional().or(z.literal('')),
});

export async function submitProfile(_prev: { error: string | null }, formData: FormData) {
  const { subscriber } = await requireAuth();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Por favor revisa los campos requeridos.' };
  const data = parsed.data;
  await db.update(subscribers).set({
    name: data.name,
    instagramHandle: data.instagram_handle,
    dateOfBirth: data.date_of_birth,
    phone: data.phone || null,
    timezone: data.timezone,
    notesFromSubscriber: data.notes_from_subscriber || null,
    profileCompletedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(subscribers.id, subscriber.id));
  redirect('/cuenta');
}
