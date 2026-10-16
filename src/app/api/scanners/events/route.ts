import { NextRequest, NextResponse } from 'next/server';
import { relay } from '@/lib/platform';

/** A company's events a scanner can be attached to: not closed and not over. */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId');
  if (!companyId || !/^\d+$/.test(companyId)) {
    return NextResponse.json({ status: false, message: 'A company is required' }, { status: 400 });
  }
  return relay(`/gate/admin/events?companyId=${companyId}`, { method: 'GET' }, 'Could not load events');
}
