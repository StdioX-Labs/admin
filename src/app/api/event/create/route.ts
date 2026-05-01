import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');
    if (!authTokenCookie?.value) {
      return NextResponse.json({ status: false, message: 'Please log in to continue' }, { status: 401 });
    }
    try {
      const authData = JSON.parse(authTokenCookie.value);
      if (Date.now() - (authData.issuedAt || 0) > 2 * 60 * 60 * 1000) {
        cookieStore.delete('auth_token');
        return NextResponse.json({ status: false, message: 'Session expired. Please log in again.' }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ status: false, message: 'Invalid session.' }, { status: 401 });
    }

    const body = await request.json();
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');

    // Inject user/company from session if not provided
    const enrichedBody = { ...body };
    try {
      const authData = JSON.parse(authTokenCookie.value);
      if (!enrichedBody.users && authData.userId) {
        enrichedBody.users = { id: authData.userId };
      }
      if (!enrichedBody.company && authData.companyId) {
        enrichedBody.company = { id: authData.companyId };
      }
    } catch { /* use body as-is */ }

    const response = await fetch(`${API_BASE_URL}/event/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(enrichedBody),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return NextResponse.json({ status: false, message: 'Invalid response from API' }, { status: 500 });
    }

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ status: false, message: data.message || 'Failed to create event' }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
