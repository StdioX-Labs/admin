import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upstreamStatus, SESSION_MAX_AGE_MS } from '@/lib/auth';
import { signPayload, SigningKeyMissingError } from '@/lib/report-signing';
import { fetchTicketFigures } from '@/lib/event-figures';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

const num = (...v: Array<number | undefined>) => v.find((x) => typeof x === 'number') ?? 0;

/**
 * Issues a signed performance report for one event.
 *
 * The figures are read from the platform API here on the server and signed
 * before they are handed to the browser. That is the whole point: a report
 * built from numbers the client supplied would certify nothing, because the
 * client could supply any numbers it liked.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json(
        { status: false, message: 'Please log in to continue' },
        { status: 401 }
      );
    }

    let issuedBy = 'unknown';
    try {
      const authData = JSON.parse(authTokenCookie.value);
      if (Date.now() - (authData.issuedAt || 0) > SESSION_MAX_AGE_MS) {
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }
      issuedBy = authData.email || 'unknown';
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}/event/get?eventId=${id}`, {
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: 'The platform API returned an invalid response' },
        { status: 502 }
      );
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { status: false, message: data.message || 'Failed to load the event' },
        { status: upstreamStatus(response.status) }
      );
    }

    const event = data.event ?? data.data ?? data;
    if (!event || typeof event !== 'object' || !event.eventName) {
      return NextResponse.json({ status: false, message: 'Event not found' }, { status: 404 });
    }

    // The event detail endpoint carries identity but not sales: its
    // `soldQuantity` is a column nothing on the platform ever increments, and
    // it has no revenue field at all. Reading counts from there produced a
    // signed document stating zero tickets and zero revenue for every event.
    const numericId = num(event.id, event.eventId, Number(id));
    const summaries = await fetchTicketFigures(numericId, String(event.eventName));

    // A certified document that quietly reports zeros is worse than no
    // document, because the signature makes the zeros look authoritative.
    if (!summaries) {
      console.error(`[Event Report API] No admin ticket summaries for event ${numericId}`);
      return NextResponse.json(
        {
          status: false,
          message:
            'Sales figures for this event are unavailable, so a certified report cannot be issued.',
        },
        { status: 502 }
      );
    }

    const lines = summaries.map((t) => ({
      ticketId: t.ticketId,
      ticketName: t.ticketName,
      unitPrice: t.ticketPrice,
      ticketsIssued: t.ticketsIssued,
      ticketsPaid: t.ticketsPaid,
      ticketsComplimentary: t.ticketsComplimentary,
      revenue: t.revenue,
      allocated: t.allocated,
      remaining: t.remaining,
    }));

    const ticketsIssued = lines.reduce((s, l) => s + l.ticketsIssued, 0);
    const ticketsPaid = lines.reduce((s, l) => s + l.ticketsPaid, 0);
    const ticketsComplimentary = lines.reduce((s, l) => s + l.ticketsComplimentary, 0);
    const grossRevenue = lines.reduce((s, l) => s + l.revenue, 0);
    const commissionRate = num(event.percentageCommission, event.percentageComission);
    const platformFee = Math.round(grossRevenue * (commissionRate / 100) * 100) / 100;

    const issuedAt = new Date();
    const reference = [
      'SOA-EVT',
      String(num(event.id, event.eventId, Number(id))).padStart(6, '0'),
      issuedAt.toISOString().slice(0, 10).replace(/-/g, ''),
    ].join('-');

    // Everything inside `report` is covered by the signature.
    const report = {
      reference,
      issuedAt: issuedAt.toISOString(),
      issuedBy,
      event: {
        eventId: num(event.id, event.eventId, Number(id)),
        eventName: event.eventName,
        eventLocation: event.eventLocation ?? '',
        eventStartDate: event.eventStartDate ?? '',
        eventEndDate: event.eventEndDate ?? '',
        status: event.status ?? '',
        companyId: num(event.companyId),
        companyName: event.companyName ?? '',
        currency: event.currency ?? 'KES',
      },
      performance: {
        ticketTypes: lines.length,
        ticketsIssued,
        ticketsPaid,
        ticketsComplimentary,
        grossRevenue,
        commissionRate,
        platformFee,
        netToOrganiser: Math.round((grossRevenue - platformFee) * 100) / 100,
      },
      lines,
    };

    const certificate = signPayload(report);
    return NextResponse.json({ status: true, report, certificate });
  } catch (error) {
    if (error instanceof SigningKeyMissingError) {
      console.error('[Event Report API]', error.message);
      return NextResponse.json(
        { status: false, message: 'Report signing is not configured on this deployment.' },
        { status: 503 }
      );
    }
    console.error('[Event Report API] Exception:', error);
    return NextResponse.json(
      { status: false, message: 'An error occurred while building the report' },
      { status: 500 }
    );
  }
}
