'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Get the request body containing the user-entered OTP
    const body = await request.json();
    const { otp: userEnteredOtp } = body;

    // Get the stored verification data from cookies
    const cookieStore = cookies();
    const verificationCookie = cookieStore.get('auth_verification');

    if (!verificationCookie || !verificationCookie.value) {
      return NextResponse.json({
        message: 'Verification session expired or invalid. Please request a new OTP.',
        status: false
      }, { status: 401 });
    }

    // Parse the verification data
    const verificationData = JSON.parse(verificationCookie.value);
    const { otp: storedOtp, user, timestamp } = verificationData;

    // Check if the OTP has expired (5 minutes)
    const now = Date.now();
    if (now - timestamp > 5 * 60 * 1000) {
      // Clear the expired cookie
      cookieStore.delete('auth_verification');

      return NextResponse.json({
        message: 'Verification code has expired. Please request a new one.',
        status: false
      }, { status: 401 });
    }

    // Validate the OTP
    if (userEnteredOtp !== storedOtp) {
      return NextResponse.json({
        message: 'Invalid verification code. Please try again.',
        status: false
      }, { status: 401 });
    }

    // Check if the user is a SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({
        message: 'Access denied. Only administrators can access this portal.',
        status: false
      }, { status: 403 });
    }

    // OTP is valid and user is a SUPER_ADMIN, create an authentication token
    const authToken = {
      userId: user.user_id,
      role: user.role,
      email: user.email,
      companyId: user.company_id,
      issuedAt: now,
    };

    // Clear the verification cookie as it's no longer needed
    cookieStore.delete('auth_verification');

    // Create a new response with auth token and user data
    const response = NextResponse.json({
      message: 'Login successful',
      user,
      status: true
    });

    // Set the authentication token in a cookie
    response.cookies.set({
      name: 'auth_token',
      value: JSON.stringify(authToken),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'strict'
    });

    return response;
  } catch (error) {
    console.error('OTP validation error:', error);
    return NextResponse.json(
      { message: 'Error validating OTP', status: false },
      { status: 500 }
    );
  }
}
