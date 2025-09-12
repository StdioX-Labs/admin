import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resetRateLimitForIdentifier } from '../login/route';
import { withErrorHandler } from '@/lib/utils';

async function handlePost(request: Request) {
  // Get the cookie store
  const cookieStore = cookies();

  // Get user email from the auth token to reset their OTP timer
  const authTokenCookie = cookieStore.get('auth_token');
  if (authTokenCookie && authTokenCookie.value) {
    try {
      const authData = JSON.parse(authTokenCookie.value);
      const userEmail = authData.email;

      // Reset the OTP request timer for this user
      if (userEmail) {
        resetRateLimitForIdentifier(userEmail);
      }
    } catch (e) {
      console.error('Error parsing auth token during logout:', e);
    }
  }

  // Clear the auth_token cookie
  cookieStore.delete('auth_token');

  // Return success response with proper headers
  return NextResponse.json(
    {
      success: true,
      message: 'Logged out successfully',
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

// Export the POST handler with error handling wrapper
export const POST = withErrorHandler(handlePost);
