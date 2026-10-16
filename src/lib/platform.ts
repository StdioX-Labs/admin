import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_MAX_AGE_MS, upstreamStatus } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

/**
 * The console-session check every proxy route makes. Returns the response to send when the
 * session is missing or expired, or null when the request may go on.
 */
export async function sessionError(): Promise<NextResponse | null> {
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
    return NextResponse.json({ status: false, message: 'Invalid session. Please log in again.' }, { status: 401 });
  }
  return null;
}

/**
 * Calls the platform API with the console's service login and relays its JSON. The platform
 * answers errors as {status: false, error}; the console reads `message`, so both are passed on.
 */
export async function relay(path: string, init: RequestInit = {}, failMessage = 'The platform API failed'): Promise<NextResponse> {
  const denied = await sessionError();
  if (denied) return denied;
  try {
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...init.headers,
      },
      cache: 'no-store',
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: 'The platform API returned an invalid response' },
        { status: response.ok ? 502 : upstreamStatus(response.status) }
      );
    }
    const data = await response.json();
    if (!response.ok || data?.status === false) {
      return NextResponse.json(
        { ...data, status: false, message: data?.message || data?.error || failMessage },
        { status: response.ok ? 400 : upstreamStatus(response.status) }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[platform ${path}]`, error);
    return NextResponse.json({ status: false, message: failMessage }, { status: 500 });
  }
}
