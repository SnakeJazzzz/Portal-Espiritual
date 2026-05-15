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
  const colMap: Record<string, keyof typeof subscribers.$inferInsert> = {
    name: 'name',
    instagram_handle: 'instagramHandle',
    phone: 'phone',
    timezone: 'timezone',
    notes_from_subscriber: 'notesFromSubscriber',
  };
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    const col = colMap[key];
    if (col) update[col] = value === '' ? null : value;
  }
  await db.update(subscribers).set(update as any).where(eq(subscribers.id, subscriber.id));
  revalidatePath('/cuenta');
}
