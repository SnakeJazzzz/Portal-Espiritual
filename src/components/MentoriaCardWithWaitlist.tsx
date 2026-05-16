'use client';

import { useState } from 'react';
import MentoriaCard from '@/components/MentoriaCard';
import WaitlistModal from '@/components/WaitlistModal';

export default function MentoriaCardWithWaitlist({ capacityFull }: { capacityFull: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MentoriaCard capacityFull={capacityFull} onWaitlistClick={() => setOpen(true)} />
      <WaitlistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
