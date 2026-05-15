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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb column accepts arbitrary shape; opts.before/after are unknown by design
    before: (opts.before ?? null) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- jsonb column accepts arbitrary shape; opts.before/after are unknown by design
    after: (opts.after ?? null) as any,
  });
}
