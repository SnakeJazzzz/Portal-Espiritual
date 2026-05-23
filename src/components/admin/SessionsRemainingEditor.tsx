'use client';

import { useState, useTransition } from 'react';

export default function SessionsRemainingEditor({
  subscriptionId,
  initial,
}: {
  subscriptionId: string;
  initial: number;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();

  function save(newValue: number) {
    setValue(newValue);
    start(async () => {
      await fetch('/api/admin/sessions-remaining', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscriptionId, sessionsRemaining: newValue }),
      });
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
