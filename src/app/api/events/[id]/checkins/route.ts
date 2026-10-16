import { NextRequest, NextResponse } from 'next/server';
import { relay } from '@/lib/platform';

/** Every ticket let in at an event: when, at which gate, and who scanned it. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ status: false, message: 'An event is required' }, { status: 400 });
  }
  return relay(`/gate/admin/checkins?eventId=${id}`, { method: 'GET' }, 'Could not load check-ins');
}
