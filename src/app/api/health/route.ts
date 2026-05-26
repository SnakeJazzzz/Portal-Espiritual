import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  await db.execute(sql`SELECT 1`);
  return NextResponse.json({ status: 'ok' });
}
