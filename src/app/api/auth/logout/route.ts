import { NextResponse } from 'next/server';
import { COOKIE_NAME, deleteSession } from '@/lib/auth';
import { getEnv } from '@/lib/env';

export async function POST() {
  await deleteSession();
  const response = NextResponse.redirect(`${getEnv().APP_URL}/`, { status: 303 });
  // Defense-in-depth: cookies().delete() inside deleteSession() may not
  // flow into a manually constructed NextResponse.redirect(). Setting
  // the deletion explicitly on the response guarantees the browser
  // receives Set-Cookie: pe_session=; Max-Age=0. See Smoke round 1 P0.3
  // hypothesis H1 — without this, /login could still see a valid cookie
  // post-logout even though the DB session row was deleted.
  response.cookies.delete(COOKIE_NAME);
  return response;
}
