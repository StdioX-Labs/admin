import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function GET(request: NextRequest) {
  console.log('[Events API] Starting request...');

  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');

    console.log('[Events API] Auth token cookie exists:', !!authTokenCookie);

    if (!authTokenCookie || !authTokenCookie.value) {
      console.error('[Events API] No auth token found');
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
      const maxAge = 8 * 60 * 60 * 1000; // 2 hours

      if (now - issuedAt > maxAge) {
        console.error('[Events API] Token expired');
        cookieStore.delete('auth_token');
        return NextResponse.json(
          { error: 'Session expired', status: false, message: 'Your session has expired. Please log in again.' },
          { status: 401 }
        );
      }

      console.log('[Events API] User authenticated:', authData.email);
    } catch (parseError) {
      console.error('[Events API] Invalid token format:', parseError);
      return NextResponse.json(
        { error: 'Invalid session', status: false, message: 'Invalid session. Please log in again.' },
        { status: 401 }
      );
    }

    // Get pagination parameters from query string
    const searchParams = request.nextUrl.searchParams;
    // Default to page 0 and size 10 as per client requirements
    const page = searchParams.get('page') || '0';
    const size = searchParams.get('size') || '10';
    const searchName = searchParams.get('searchName');
    const status = searchParams.get('status');

    // Create Basic auth string for external API
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    let apiUrl = `${API_BASE_URL}/admin/events/get/all?page=${page}&size=${size}`;
    if (searchName) {
      apiUrl += `&searchName=${encodeURIComponent(searchName)}`;
    }
    if (status) {
      apiUrl += `&status=${encodeURIComponent(status)}`;
    }

    console.log('[Events API] Fetching from:', apiUrl);

    // Make request to the external API using Basic auth
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('[Events API] Response status:', response.status);

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('[Events API] Non-JSON response:', contentType);
      return NextResponse.json(
        { error: 'Invalid response from API', status: false, message: 'The API returned an invalid response' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('[Events API] Response data preview:', JSON.stringify(data).substring(0, 200));

    if (!response.ok) {
      console.error('[Events API] API returned error:', data);
      return NextResponse.json(
        {
          error: data.message || 'Failed to fetch events',
          status: false,
          message: data.message || 'Failed to fetch events'
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Events API] Exception occurred:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        status: false,
        message: 'An error occurred while fetching events'
      },
      { status: 500 }
    );
  }
}

