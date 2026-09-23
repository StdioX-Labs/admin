import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upstreamStatus, SESSION_MAX_AGE_MS } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

/**
 * Suspends or reactivates a user.
 *
 * Two upstream endpoints rather than a toggle — /company/user/suspend and
 * /company/user/reactivate — so a repeated call is idempotent in intent
 * instead of flipping whatever state it happens to find.
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }

    let requesterUserId: number | undefined;
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
      requesterUserId = Number(authData.userId);
      issuerEmail = authData.email || 'unknown';
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }
    if (!requesterUserId || Number.isNaN(requesterUserId)) {
      return NextResponse.json(
        { status: false, message: 'Your session does not identify a requesting user.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = Number(body?.userId);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ status: false, message: 'A user is required' }, { status: 400 });
    }

    const active = body?.active;
    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { status: false, message: 'Specify whether the user should be active' },
        { status: 400 }
      );
    }

    const action = active ? 'reactivate' : 'suspend';
    console.log(`[User Status] ${issuerEmail} ${action}ing user ${userId}`);

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(
      `${API_BASE_URL}/company/user/${action}?userId=${userId}&requesterUserId=${requesterUserId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const text = await response.text();
    if (!response.headers.get('content-type')?.includes('application/json')) {
      console.error('[User Status] Non-JSON response:', response.status, text.slice(0, 300));
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
    return NextResponse.json(data);
  } catch (error) {
    console.error('[User Status] Exception:', error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to update the user' },
      { status: 500 }
    );
  }
}
