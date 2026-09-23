import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { upstreamStatus, SESSION_MAX_AGE_MS } from '@/lib/auth';
import { normalizeKenyanPhone, normalizeEmail, isValidEmail } from '@/lib/phone';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

const ROLES = ['SUPER_ADMIN', 'COMPANY_OWNER', 'STAFF'] as const;
type Role = (typeof ROLES)[number];

/**
 * A distinct password per account.
 *
 * The organiser dashboard sends one hard-coded literal for every user it
 * creates, which makes it a shared credential across every account the
 * platform has ever provisioned that way. Sign-in here is by emailed OTP, so
 * nobody needs to be told this value; generating a random one per user removes
 * the shared secret without changing anything a person does.
 */
function generatePassword(): string {
  // Mixed classes because the platform may enforce composition rules.
  const body = randomBytes(24).toString('base64url');
  return `Aa1!${body}`;
}

/**
 * Creates a user against a company.
 *
 * Contract matches the organiser dashboard's /user/create. The company is
 * chosen by the admin here rather than taken from the caller's own session,
 * because this console administers every company rather than one.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }

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
      issuerEmail = authData.email || 'unknown';
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    const body = await request.json();

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

    const companyId = Number(body?.companyId);
    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json({ status: false, message: 'Select a company' }, { status: 400 });
    }

    const roles = String(body?.roles ?? '') as Role;
    if (!ROLES.includes(roles)) {
      return NextResponse.json(
        { status: false, message: `Role must be one of ${ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // The platform requires the field; the organiser dashboard sends all-zeroes
    // when it has nothing, so match that rather than invent an identifier.
    const idNumber = String(body?.idNumber ?? '').trim() || '00000000';

    const payload = {
      fullName,
      idNumber,
      mobileNumber,
      password: generatePassword(),
      emailAddress,
      isExternal: false,
      company: { id: companyId },
      roles,
    };

    console.log(`[User Create] ${issuerEmail} creating ${roles} ${emailAddress} for company ${companyId}`);

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}/user/create`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.headers.get('content-type')?.includes('application/json')) {
      console.error('[User Create] Non-JSON response:', response.status, text.slice(0, 300));
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
    // The generated password is deliberately not echoed back — sign-in is by OTP.
    return NextResponse.json(data);
  } catch (error) {
    console.error('[User Create] Exception:', error);
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to create the user' },
      { status: 500 }
    );
  }
}
