import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/client';
import { subscribers, subscriptions, products } from '@/db/schema';
import { eq } from 'drizzle-orm';

vi.mock('@/lib/auth', async () => {
  const real = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...real,
    requireAdmin: vi.fn(async () => ({ subscriber: { id: 'admin_id', role: 'admin' } })),
  };
});

import { notFound } from 'next/navigation';
vi.mock('next/navigation', async () => {
  const real = await vi.importActual<typeof import('next/navigation')>('next/navigation');
  return {
    ...real,
    notFound: vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    }),
  };
});

import SubscriberDetail from '@/app/admin/[id]/page';

function makeStderrSpy() {
  return vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

describe('Admin detail — UUID validation', () => {
  let stderrSpy: ReturnType<typeof makeStderrSpy>;

  beforeEach(() => {
    vi.mocked(notFound).mockClear();
    stderrSpy = makeStderrSpy();
  });

  afterEach(async () => {
    stderrSpy.mockRestore();
    await db.delete(subscriptions).where(eq(subscriptions.stripeSubscriptionId, 'sub_admin_uuid_test'));
    await db.delete(subscribers).where(eq(subscribers.email, 'adminuuid@example.com'));
  });

  it('calls notFound when id is ".env" (no postgres error, no stderr noise)', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '.env' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();

    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrCalls).not.toContain('22P02');
    expect(stderrCalls).not.toContain('invalid input syntax for type uuid');
  });

  it('calls notFound when id is "../etc/passwd"', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '../etc/passwd' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound when id is "123"', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '123' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('calls notFound when id is empty string', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: '' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('renders normally with a valid UUID that maps to a real subscriber (no notFound)', async () => {
    const product = await db.query.products.findFirst({ where: eq(products.slug, 'mentoria-1a1') });
    if (!product) throw new Error('mentoria product not seeded');
    await db.insert(subscribers).values({
      email: 'adminuuid@example.com',
      stripeCustomerId: 'cus_admin_uuid',
    });
    const subscriber = await db.query.subscribers.findFirst({
      where: eq(subscribers.email, 'adminuuid@example.com'),
    });
    if (!subscriber) throw new Error('subscriber seed failed');
    const now = new Date();
    await db.insert(subscriptions).values({
      subscriberId: subscriber.id,
      productId: product.id,
      status: 'active',
      stripeSubscriptionId: 'sub_admin_uuid_test',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 86400 * 1000),
      sessionsRemaining: 2,
    });

    const result = await SubscriberDetail({
      params: Promise.resolve({ id: subscriber.id }),
    });
    expect(result).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('calls notFound when id is a valid UUID format but no subscriber exists (db path reached, second notFound site fires)', async () => {
    await expect(
      SubscriberDetail({ params: Promise.resolve({ id: 'a3bb189e-8bf9-4d8c-9f1a-1234567890ab' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrCalls).not.toContain('22P02');
  });
});
