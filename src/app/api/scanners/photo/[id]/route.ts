import { NextRequest, NextResponse } from 'next/server';
import { relayImage } from '@/lib/platform';

/** The photo a gate scanner took of a scan: the code as the camera saw it. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ status: false, message: 'A photo is required' }, { status: 400 });
  }
  return relayImage(`/gate/admin/photo/${id}`);
}
