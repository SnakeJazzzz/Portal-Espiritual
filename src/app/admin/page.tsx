import Link from 'next/link';
import { db } from '@/db/client';
import { subscribers, subscriptions } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import SubscribersList from '@/components/admin/SubscribersList';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const showCanceled = view === 'canceled';
  const statuses: ('active' | 'past_due' | 'canceled')[] = showCanceled
    ? ['canceled']
    : ['active', 'past_due'];

  const rows = await db
    .select({
      subscriberId: subscribers.id,
      name: subscribers.name,
      email: subscribers.email,
      createdAt: subscriptions.createdAt,
      sessionsRemaining: subscriptions.sessionsRemaining,
      status: subscriptions.status,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
    })
    .from(subscriptions)
    .innerJoin(subscribers, eq(subscribers.id, subscriptions.subscriberId))
    .where(inArray(subscriptions.status, statuses));

  return (
    <>
      <div className="mb-4 flex gap-4 text-sm">
        <Link href="/admin" className={!showCanceled ? 'underline' : ''}>
          Activas
        </Link>
        <Link href="/admin?view=canceled" className={showCanceled ? 'underline' : ''}>
          Canceladas
        </Link>
      </div>
      <SubscribersList rows={rows} />
    </>
  );
}
