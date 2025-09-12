'use server';

import { NextResponse } from 'next/server';

// Get environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json();

    // Create auth string
    const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');

    // Make the request to the external API
    const response = await fetch(`${API_BASE_URL}/user/otp/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Get the response data
    const data = await response.json();

    // Return the response
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { message: 'Error connecting to API', status: false },
      { status: 500 }
    );
  }
}
