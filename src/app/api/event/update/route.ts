import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ status: false, message: 'Event ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (API_USERNAME && API_PASSWORD) {
      const credentials = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(`${API_BASE_URL}/event/update?eventId=${eventId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    const text = await response.text();

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: `API returned non-JSON response (${response.status})`, details: text },
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
      { status: false, message: error instanceof Error ? error.message : 'Failed to update event' },
      { status: 500 }
    );
  }
}
