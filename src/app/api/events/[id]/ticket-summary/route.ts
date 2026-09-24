import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_MAX_AGE_MS, upstreamStatus } from '@/lib/auth';
import { authHeader, fetchTicketFigures } from '@/lib/event-figures';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Accurate per-tier counts for one event.
 *
 * Exists because the event detail payload the editor already holds cannot
 * answer this: its `soldQuantity` is never incremented and it has no revenue
 * field, so a sales table built from it reads zero everywhere.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }
    try {
      const authData = JSON.parse(authTokenCookie.value);
      if (Date.now() - (authData.issuedAt || 0) > SESSION_MAX_AGE_MS) {
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    const detail = await fetch(`${API_BASE_URL}/event/get?eventId=${id}`, {
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    if (!detail.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: 'The platform API returned an invalid response' },
        { status: 502 }
      );
    }
    const detailData = await detail.json();
    if (!detail.ok) {
      return NextResponse.json(
        { status: false, message: detailData?.message || 'Failed to load the event' },
        { status: upstreamStatus(detail.status) }
      );
    }

    const event = detailData.event ?? detailData.data ?? detailData;
    const eventId = Number(event?.id ?? event?.eventId ?? id);
    if (!event?.eventName) {
      return NextResponse.json({ status: false, message: 'Event not found' }, { status: 404 });
    }

    const figures = await fetchTicketFigures(eventId, String(event.eventName));
    if (!figures) {
      // "Unknown" and "zero" are different answers; say which this is.
      return NextResponse.json(
        { status: false, message: 'Ticket figures for this event are unavailable.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ status: true, figures });
  } catch (error) {
    console.error('[Ticket Summary API] Exception:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to load ticket figures' },
      { status: 500 }
    );
  }
}
