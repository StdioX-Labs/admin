import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function POST(request: NextRequest) {
  console.log('[Event Activate API] Starting request...');

  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');

    if (!authTokenCookie || !authTokenCookie.value) {
      console.error('[Event Activate API] No auth token found');
      return NextResponse.json(
        { error: 'Unauthorized - No auth token', status: false, message: 'Please log in to continue' },
        { status: 401 }
      );
    }

    // Parse the auth token to verify the user is authenticated
    try {
      const authData = JSON.parse(authTokenCookie.value);

      // Check if the token is expired (2 hours)
      const now = Date.now();
      const issuedAt = authData.issuedAt || 0;
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      if (now - issuedAt > maxAge) {
        console.error('[Event Activate API] Token expired');
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { error: 'Session expired', status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }

      console.log('[Event Activate API] User authenticated:', authData.email);
    } catch (parseError) {
      console.error('[Event Activate API] Invalid token format:', parseError);
      return NextResponse.json(
        { error: 'Invalid session', status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    console.log('[Event Activate API] Activation data:', JSON.stringify(body));

    // Create Basic auth string for external API
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const apiUrl = `${API_BASE_URL}/event/activate`;

    console.log('[Event Activate API] Activating at:', apiUrl);

    // Make request to the external API using Basic auth
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[Event Activate API] Response status:', response.status);

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[Event Activate API] Non-JSON response:', contentType);
      return NextResponse.json(
        { error: 'Invalid response from API', status: false, message: 'The API returned an invalid response' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('[Event Activate API] Response data:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      console.error('[Event Activate API] API returned error:', data);
      return NextResponse.json(
        {
          error: data.message || 'Failed to activate event',
          status: false,
          message: data.message || 'Failed to activate event'
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Event Activate API] Exception occurred:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        status: false,
        message: 'An error occurred while activating event'
      },
      { status: 500 }
    );
  }
}
