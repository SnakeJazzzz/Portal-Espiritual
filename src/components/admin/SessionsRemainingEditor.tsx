'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionsRemainingEditor({
  subscriptionId,
  initial,
}: {
  subscriptionId: string;
  initial: number;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  function save(newValue: number) {
    setValue(newValue);
    start(async () => {
      const r = await fetch('/api/admin/sessions-remaining', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId, sessionsRemaining: newValue }),
      });
      if (r.ok) router.refresh();
    });
  }

  return (
    <input
      type="number"
      value={value}
      disabled={pending}
      min={0}
      max={99}
      onChange={(e) => save(Number(e.target.value))}
      className="w-20 bg-white/[0.05] text-white rounded px-2 py-1"
    />
  );
}
