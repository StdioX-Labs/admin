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

    // Create a modified response that doesn't include the OTP in the client response
    // Store the OTP in the session cookie securely so it can be validated server-side
    const { otp, ...safeData } = data;

    // Create a secure, httpOnly cookie with the OTP that will be used for validation
    // but won't be accessible via JavaScript on the client
    const responseObj = NextResponse.json(safeData);

    // Store user information and OTP in an encrypted cookie
    responseObj.cookies.set({
      name: 'auth_verification',
      // Store a JSON string with OTP and user info
      value: JSON.stringify({
        otp,
        user: data.user,
        timestamp: Date.now() // Add timestamp for expiration checking
      }),
      httpOnly: true, // Not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
      maxAge: 300, // Expires in 5 minutes (300 seconds)
      path: '/',
      sameSite: 'strict'
    });

    return responseObj;
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { message: 'Error connecting to API', status: false },
      { status: 500 }
    );
  }
}
