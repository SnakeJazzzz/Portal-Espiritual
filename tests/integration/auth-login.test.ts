import '../helpers/resend-mock';
import { sentEmails, resetSentEmails } from '../helpers/resend-mock';
import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/db/client';
import { subscribers } from '@/db/schema';
import { POST } from '@/app/api/auth/login/route';

function postLogin(email: string, ip = '1.2.3.4') {
  return POST(
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip, 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    }) as any,
  );
}

beforeEach(() => {
  resetSentEmails();
});

describe('Test 9 — Login no-leak: existent and non-existent both 200', () => {
  it('non-existent email returns 200 with no Resend send', async () => {
    const r = await postLogin('ghost@example.com');
    expect(r.status).toBe(200);
    expect(sentEmails.filter((e) => e.to === 'ghost@example.com')).toHaveLength(0);
  });

  it('existent email returns 200 with exactly one Resend send', async () => {
    await db.insert(subscribers).values({ email: 'real@example.com' });
    const r = await postLogin('real@example.com');
    expect(r.status).toBe(200);
    expect(sentEmails.filter((e) => e.to === 'real@example.com')).toHaveLength(1);
  });
});

describe('Test 10 — Rate limit per-IP exceed', () => {
  it('6th request from same IP within 1 min returns 429', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await postLogin(`person${i}@example.com`, '5.5.5.5');
      expect(r.status).toBe(200);
    }
    const r6 = await postLogin('person6@example.com', '5.5.5.5');
    expect(r6.status).toBe(429);
  });
});

describe('Test 11 — Rate limit per-IP isolation', () => {
  it('5 from IP_A interleaved with 5 from IP_B: all 10 succeed', async () => {
    for (let i = 0; i < 5; i++) {
      const ra = await postLogin(`a${i}@example.com`, '7.7.7.7');
      const rb = await postLogin(`b${i}@example.com`, '8.8.8.8');
      expect(ra.status).toBe(200);
      expect(rb.status).toBe(200);
    }
  });
});
