import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_MAX_AGE_MS, upstreamStatus } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

/**
 * Everyone holding a ticket to an event.
 *
 * Upstream is /gl/event/attendees/list, which takes only the event — the
 * sibling /event/attendees/get additionally wants a userId to attribute the
 * request to, which this console has no use for.
 *
 * The gl prefix is not decoration: GLManagerController is mapped at
 * "api/v1/gl", so its routes do not sit beside the others under api/v1. Reading
 * a method's @GetMapping without its class's @RequestMapping is what put this
 * one, and the transactions proxy, at an address that does not exist.
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

    const eventId = Number(id);
    if (!eventId || Number.isNaN(eventId)) {
      return NextResponse.json({ status: false, message: 'An event is required' }, { status: 400 });
    }

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}/gl/event/attendees/list?eventId=${eventId}`, {
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: 'The platform API returned an invalid response' },
        { status: 502 }
      );
    }
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { status: false, message: data?.message || 'Failed to load attendees' },
        { status: upstreamStatus(response.status) }
      );
    }

    return NextResponse.json({ status: true, attendees: data?.attendees ?? [] });
  } catch (error) {
    console.error('[Attendees API] Exception:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to load attendees' },
      { status: 500 }
    );
  }
}
