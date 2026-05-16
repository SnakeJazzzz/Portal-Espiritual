import { describe, it, expect } from 'vitest';
import { db } from '@/db/client';
import { waitlist } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { submitWaitlist } from '@/app/mentoria/waitlist-actions';

describe('Waitlist submission', () => {
  it('requires consent', async () => {
    const fd = new FormData();
    fd.append('email', 'no-consent@example.com');
    // consent omitted
    const result = await submitWaitlist({ ok: false, error: null }, fd);
    expect(result.ok).toBe(false);
  });

  it('inserts a row with privacy version', async () => {
    const fd = new FormData();
    fd.append('email', 'yes-consent@example.com');
    fd.append('consent', 'on');
    const result = await submitWaitlist({ ok: false, error: null }, fd);
    expect(result.ok).toBe(true);
    const rows = await db.select().from(waitlist).where(eq(waitlist.email, 'yes-consent@example.com'));
    expect(rows).toHaveLength(1);
    expect(rows[0].consentPrivacyVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
