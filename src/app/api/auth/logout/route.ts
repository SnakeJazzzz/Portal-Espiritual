import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import { getEnv } from '@/lib/env';

export async function POST() {
  await deleteSession();
  return NextResponse.redirect(`${getEnv().APP_URL}/`, { status: 303 });
}
