'use server';

import { z } from 'zod';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  instagram_handle: z.string().min(1).max(60).optional(),
  phone: z.string().max(40).optional(),
  timezone: z.string().min(1).max(60).optional(),
  notes_from_subscriber: z.string().max(2000).optional(),
}).partial();

export async function updateSubscriberField(formData: FormData) {
  const { subscriber } = await requireAuth();
  const data = updateSchema.parse(Object.fromEntries(formData));
  const update: Partial<typeof subscribers.$inferInsert> = { updatedAt: new Date() };
  // Nullable text columns: empty string clears the field.
  const v = (s: string) => (s === '' ? null : s);
  if (data.name !== undefined) update.name = v(data.name);
  if (data.instagram_handle !== undefined) update.instagramHandle = v(data.instagram_handle);
  if (data.phone !== undefined) update.phone = v(data.phone);
  if (data.notes_from_subscriber !== undefined) update.notesFromSubscriber = v(data.notes_from_subscriber);
  // timezone is NOT NULL; zod min(1) guarantees a non-empty string when present.
  if (data.timezone !== undefined) update.timezone = data.timezone;
  await db.update(subscribers).set(update).where(eq(subscribers.id, subscriber.id));
  revalidatePath('/cuenta');
}
