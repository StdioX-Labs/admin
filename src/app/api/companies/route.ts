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
      return NextResponse.json({ status: false, message: 'Unauthorized' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const page = sp.get('page') || '0';
    const size = sp.get('size') || '20';
    const search = sp.get('search');

    let url = `${API_BASE_URL}/admin/companies?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Basic ${authString}`, 'Content-Type': 'application/json' },
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('[Companies API] Non-JSON response from backend:', {
        status: response.status,
        contentType,
        url,
        body: text.substring(0, 500),
      });
      return NextResponse.json(
        { status: false, message: `Backend returned HTTP ${response.status} (non-JSON)` },
        { status: 500 }
      );
    }

    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ status: false, message: 'Failed to parse response' }, { status: 500 });
    }

    if (!response.ok) return NextResponse.json(data, { status: response.status });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}
