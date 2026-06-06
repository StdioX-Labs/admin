import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');

    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }

    let userId: number | null = null;
    try {
      const authData = JSON.parse(authTokenCookie.value);
      const maxAge = 8 * 60 * 60 * 1000;
      if (Date.now() - (authData.issuedAt || 0) > maxAge) {
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }
      userId = authData.userId || null;
    } catch {
      return NextResponse.json(
        { status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    if (!userId) {
      return NextResponse.json({ status: false, message: 'User ID not found in session' }, { status: 401 });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_USERNAME && API_PASSWORD) {
      headers['Authorization'] = `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`;
    }

    const apiUrl = `${API_BASE_URL}/user/challange?userId=${userId}`;
    const response = await fetch(apiUrl, { method: 'GET', headers });

    const contentType = response.headers.get('content-type');
    const text = await response.text();

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: `API returned non-JSON response (${response.status})` },
        { status: response.status || 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ status: false, message: 'Failed to parse API response' }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
