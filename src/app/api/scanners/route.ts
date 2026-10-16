import { NextRequest } from 'next/server';
import { relay } from '@/lib/platform';

/**
 * Scanner accounts: door staff who sign in to the gate app with a phone number and password.
 * GET lists them (by companyId or eventId); POST creates one.
 */
export async function GET(request: NextRequest) {
  const qs = new URLSearchParams();
  for (const k of ['companyId', 'eventId']) {
    const v = request.nextUrl.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return relay(`/gate/admin/scanners?${qs}`, { method: 'GET' }, 'Could not load scanners');
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return relay('/gate/admin/scanners', { method: 'POST', body: JSON.stringify(body) }, 'Could not create the scanner');
}
