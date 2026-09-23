import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upstreamStatus, SESSION_MAX_AGE_MS } from '@/lib/auth';
import { normalizeKenyanPhone, normalizeEmail, isValidEmail } from '@/lib/phone';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

const ROLES = ['SUPER_ADMIN', 'COMPANY_OWNER', 'STAFF'] as const;

/**
 * Edits a user, including moving them to another company.
 *
 * Upstream is PUT /company/user/edit. `requesterUserId` is taken from the
 * session rather than the request: the platform treats that parameter as the
 * acting administrator, so accepting it from a client would let one attribute
 * an edit — or a cross-company move — to somebody else.
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

    const fullName = String(body?.fullName ?? '').trim();
    if (fullName.length < 2) {
      return NextResponse.json({ status: false, message: "Enter the user's full name" }, { status: 400 });
    }

    const emailAddress = normalizeEmail(body?.emailAddress ?? '');
    if (!isValidEmail(emailAddress)) {
      return NextResponse.json({ status: false, message: 'Enter a valid email address' }, { status: 400 });
    }

    const mobileNumber = normalizeKenyanPhone(body?.mobileNumber ?? '');
    if (!mobileNumber) {
      return NextResponse.json(
        { status: false, message: 'Enter a valid Kenyan phone number, e.g. 0715066651' },
        { status: 400 }
      );
    }

    const roles = String(body?.roles ?? '');
    if (!ROLES.includes(roles as (typeof ROLES)[number])) {
      return NextResponse.json(
        { status: false, message: `Role must be one of ${ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const idNumber = String(body?.idNumber ?? '').trim() || '00000000';
    const companyId = body?.companyId != null ? Number(body.companyId) : undefined;
    if (companyId !== undefined && (!companyId || Number.isNaN(companyId))) {
      return NextResponse.json({ status: false, message: 'Select a company' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      fullName,
      idNumber,
      mobileNumber,
      emailAddress,
      roles,
    };
    if (companyId !== undefined) payload.company = { id: companyId };

    console.log(
      `[User Edit] ${issuerEmail} editing user ${userId}`,
      companyId !== undefined ? `-> company ${companyId}` : ''
    );

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(
      `${API_BASE_URL}/company/user/edit?userId=${userId}&requesterUserId=${requesterUserId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();
    if (!response.headers.get('content-type')?.includes('application/json')) {
      console.error('[User Edit] Non-JSON response:', response.status, text.slice(0, 300));
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
    console.error('[User Edit] Exception:', error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to update the user' },
      { status: 500 }
    );
  }
}
