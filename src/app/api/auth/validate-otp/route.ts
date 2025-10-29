import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withErrorHandler } from '@/lib/auth';
import { resetRateLimitForIdentifier } from '@/lib/rate-limit';

async function handlePost(request: Request) {
  // Get the request body containing the user-entered OTP
  const body = await request.json();
  const { otp: userEnteredOtp } = body;

  // Get the stored verification data from cookies
  const cookieStore = cookies();
  const verificationCookie = cookieStore.get('auth_verification');

  if (!verificationCookie || !verificationCookie.value) {
    return NextResponse.json(
      {
        message: 'Verification session expired or invalid. Please request a new OTP.',
        status: false
      },
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Parse the verification data
  const verificationData = JSON.parse(verificationCookie.value);
  const { otp: storedOtp, user, timestamp } = verificationData;

  // Check if the OTP has expired (5 minutes)
  const now = Date.now();
  if (now - timestamp > 5 * 60 * 1000) {
    // Clear the expired cookie
    cookieStore.delete('auth_verification');

    return NextResponse.json(
      {
        message: 'Verification code has expired. Please request a new one.',
        status: false
      },
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Validate the OTP
  if (userEnteredOtp !== storedOtp) {
    return NextResponse.json(
      {
        message: 'Invalid verification code. Please try again.',
        status: false
      },
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Check if the user is a SUPER_ADMIN
  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      {
        message: 'Access denied. Only administrators can access this portal.',
        status: false
      },
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // OTP is valid and user is a SUPER_ADMIN, create an authentication token
  const authToken = {
    userId: user.user_id,
    role: user.role,
    email: user.email,
    companyId: user.company_id,
    issuedAt: now,
  };

  // Reset the OTP request rate limit for this user on successful login
  if (user.email) {
    resetRateLimitForIdentifier(user.email);
  }

  // Clear the verification cookie as it's no longer needed
  cookieStore.delete('auth_verification');

  // Create a new response with auth token and sanitized user data
  const sanitizedUser = {
    role: user.role,
    email: user.email,
    phoneNumber: user.phoneNumber,
    company_name: user.company_name,
    is_active: user.is_active,
    profile_type: user.profile_type
  };

  const response = NextResponse.json(
    {
      message: 'Login successful',
      user: sanitizedUser,
      status: true
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  // Set the authentication token in a cookie with 2-hour expiry
  response.cookies.set({
    name: 'auth_token',
    value: JSON.stringify(authToken),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 2, // 2 hours (7200 seconds)
    path: '/',
    sameSite: 'strict'
  });

  return response;
}

// Export the POST handler with error handling wrapper
export const POST = withErrorHandler(handlePost);
