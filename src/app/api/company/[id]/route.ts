import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ status: false, message: 'Valid company ID is required' }, { status: 400 });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (API_USERNAME && API_PASSWORD) {
      headers['Authorization'] = `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`;
    }

    const response = await fetch(`${API_BASE_URL}/company/get?companyId=${id}`, {
      method: 'GET',
      headers,
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        { status: false, message: `Unexpected response (${response.status})` },
        { status: response.status || 500 }
      );
    }

    let data;
    try { data = JSON.parse(text); } catch {
      return NextResponse.json({ status: false, message: 'Failed to parse response' }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { status: false, message: error instanceof Error ? error.message : 'Failed to fetch company' },
      { status: 500 }
    );
  }
}
