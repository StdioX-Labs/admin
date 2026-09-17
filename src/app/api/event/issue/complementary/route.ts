import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upstreamStatus, SESSION_MAX_AGE_MS } from '@/lib/auth';
import { normalizeKenyanPhone, normalizeEmail, isValidEmail } from '@/lib/phone';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

/** Issuing free tickets is an irreversible grant, so keep the ceiling low and explicit. */
const MAX_QUANTITY_PER_TIER = 50;

interface RequestedTicket {
  ticketId?: number | string;
  quantity?: number | string;
}

/**
 * Issues complimentary tickets for an event.
 *
 * Contract matches the organiser dashboard's /event/issue/complementary, with
 * one deliberate change: `userId` is taken from the session cookie here rather
 * than accepted from the request. A client that can name its own issuer can
 * attribute free tickets to somebody else.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }

    let userId: number | undefined;
    let issuerEmail = 'unknown';
    try {
      const authData = JSON.parse(authTokenCookie.value);
      if (Date.now() - (authData.issuedAt || 0) > SESSION_MAX_AGE_MS) {
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }
      userId = Number(authData.userId);
      issuerEmail = authData.email || 'unknown';
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { status: false, message: 'Your session does not identify an issuing user.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const eventId = Number(body?.eventId);
    if (!eventId || Number.isNaN(eventId)) {
      return NextResponse.json({ status: false, message: 'An event is required' }, { status: 400 });
    }

    const email = normalizeEmail(body?.customer?.email ?? '');
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { status: false, message: 'Enter a valid recipient email address' },
        { status: 400 }
      );
    }

    const mobile = normalizeKenyanPhone(body?.customer?.mobile_number ?? '');
    if (!mobile) {
      return NextResponse.json(
        { status: false, message: 'Enter a valid Kenyan phone number, e.g. 0715066651' },
        { status: 400 }
      );
    }

    const requested: RequestedTicket[] = Array.isArray(body?.tickets) ? body.tickets : [];
    const tickets = requested
      .map((t) => ({ ticketId: Number(t.ticketId), quantity: Number(t.quantity) }))
      .filter((t) => t.ticketId && !Number.isNaN(t.ticketId));

    if (!tickets.length) {
      return NextResponse.json({ status: false, message: 'Select a ticket type' }, { status: 400 });
    }
    for (const t of tickets) {
      if (!Number.isInteger(t.quantity) || t.quantity < 1) {
        return NextResponse.json(
          { status: false, message: 'Quantity must be a whole number of at least 1' },
          { status: 400 }
        );
      }
      if (t.quantity > MAX_QUANTITY_PER_TIER) {
        return NextResponse.json(
          { status: false, message: `A single issue is capped at ${MAX_QUANTITY_PER_TIER} tickets per type` },
          { status: 400 }
        );
      }
    }

    const payload = { userId, eventId, customer: { mobile_number: mobile, email }, tickets };
    console.log(
      `[Complimentary] ${issuerEmail} issuing`,
      tickets.map((t) => `${t.quantity}x#${t.ticketId}`).join(', '),
      `for event ${eventId} to ${email}`
    );

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}/event/issue/complementary`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('[Complimentary] Non-JSON response:', response.status, text.slice(0, 300));
      return NextResponse.json(
        { status: false, message: `The platform API returned an invalid response (${response.status})` },
        { status: 502 }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { status: false, message: 'Could not read the platform API response' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: upstreamStatus(response.status) });
    }
    return NextResponse.json({ ...data, issuedTo: { email, mobile } });
  } catch (error) {
    console.error('[Complimentary] Exception:', error);
    return NextResponse.json(
      {
        status: false,
        message: error instanceof Error ? error.message : 'Failed to issue complimentary tickets',
      },
      { status: 500 }
    );
  }
}
