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
      return NextResponse.json(
        { status: false, message: 'Please log in to continue' },
        { status: 401 }
      );
    }

    try {
      const authData = JSON.parse(authTokenCookie.value);
      const now = Date.now();
      if (now - (authData.issuedAt || 0) > 2 * 60 * 60 * 1000) {
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

    const searchParams = request.nextUrl.searchParams;
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');

    let apiUrl = `${API_BASE_URL}/events/get/all`;
    const page = searchParams.get('page');
    const size = searchParams.get('size');
    if (page || size) {
      const params = new URLSearchParams();
      if (page) params.set('page', page);
      if (size) params.set('size', size);
      apiUrl += `?${params.toString()}`;
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: 'Invalid response from API' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { status: false, message: data.message || 'Failed to fetch events' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
