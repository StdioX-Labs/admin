import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function GET() {
  console.log('[B2B Active API] Starting request...');

  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');

    console.log('[B2B Active API] Auth token cookie exists:', !!authTokenCookie);

    if (!authTokenCookie || !authTokenCookie.value) {
      console.error('[B2B Active API] No auth token found');
      return NextResponse.json(
        { error: 'Unauthorized - No auth token', status: false, message: 'Please log in to continue' },
        { status: 401 }
      );
    }

    // Basic token validation similar to other proxies
    try {
      const authData = JSON.parse(authTokenCookie.value);
      const now = Date.now();
      const issuedAt = authData.issuedAt || 0;
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      if (now - issuedAt > maxAge) {
        console.error('[B2B Active API] Token expired');
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { error: 'Session expired', status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }

      console.log('[B2B Active API] User authenticated:', authData.email);
    } catch (parseError) {
      console.error('[B2B Active API] Invalid token format:', parseError);
      return NextResponse.json(
        { error: 'Invalid session', status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const apiUrl = `${API_BASE_URL}/admin/b2b-subscriptions/active`;

    console.log('[B2B Active API] Fetching from:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('[B2B Active API] Response status:', response.status);

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[B2B Active API] Non-JSON response:', contentType);
      return NextResponse.json(
        { error: 'Invalid response from API', status: false, message: 'The API returned an invalid response' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('[B2B Active API] Response data preview:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      console.error('[B2B Active API] API returned error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to fetch active subscriptions', status: false, message: data.message || 'Failed to fetch active subscriptions' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[B2B Active API] Exception occurred:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error', status: false, message: 'An error occurred while fetching active subscriptions' },
      { status: 500 }
    );
  }
}
