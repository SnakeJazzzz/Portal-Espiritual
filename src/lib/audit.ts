import { db } from '@/db/client';
import { auditLog } from '@/db/schema';

export async function appendAudit(opts: {
  adminId: string | null;
  action: string;
  targetSubscriberId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  await db.insert(auditLog).values({
    adminId: opts.adminId,
    action: opts.action,
    targetSubscriberId: opts.targetSubscriberId ?? null,
    before: opts.before ?? null,
    after: opts.after ?? null,
  });
}
