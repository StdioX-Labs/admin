import { NextRequest, NextResponse } from 'next/server';
import { relay } from '@/lib/platform';

const ACTIONS = new Set(['attach', 'password', 'active']);

/** attach: move to another event (or detach); password: set a new one; active: switch on or off. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params;
  if (!ACTIONS.has(action) || !/^\d+$/.test(id)) {
    return NextResponse.json({ status: false, message: 'Unknown scanner action' }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  return relay(`/gate/admin/scanners/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) },
    'Could not update the scanner');
}
