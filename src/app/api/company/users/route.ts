import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { upstreamStatus, SESSION_MAX_AGE_MS } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

/** The people already attached to a company — context when adding another. */
export async function GET(request: NextRequest) {
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

    const companyId = Number(request.nextUrl.searchParams.get('companyId'));
    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json({ status: false, message: 'A company is required' }, { status: 400 });
    }

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}/company/users?companyId=${companyId}`, {
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
      return NextResponse.json(data, { status: upstreamStatus(response.status) });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Company Users] Exception:', error);
    return NextResponse.json(
      { status: false, message: 'Failed to load the company roster' },
      { status: 500 }
    );
  }
}
