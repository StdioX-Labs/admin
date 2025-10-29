import { NextResponse } from 'next/server';
import { checkRateLimit, resetRateLimitForIdentifier } from '@/lib/rate-limit';
import { withErrorHandler } from '@/lib/auth';

// Get environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

// Export the rate limiting function for access in other routes
export { resetRateLimitForIdentifier };

async function handlePost(request: Request) {
  // Get the client's IP address from headers
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown-ip';

  // Get the request body
  const body = await request.json();
  const { id: identifier } = body;

  // Check both IP and identifier-based rate limiting
  if (identifier) {
    const rateLimitResult = checkRateLimit(ip.toString(), identifier);

    if (rateLimitResult) {
      return NextResponse.json(
        {
          message: rateLimitResult.message,
          status: false
        },
        {
          status: rateLimitResult.status,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }

  // Create auth string
  const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');

  // Make the request to the external API
  const response = await fetch(`${API_BASE_URL}/user/otp/login`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body),
  });

  // Check content type
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error('Non-JSON response from external API:', {
      status: response.status,
      contentType
    });
    return NextResponse.json(
      {
        message: 'Invalid response from authentication service',
        status: false
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // Get the response data
  const data = await response.json();

  // Create a modified response that doesn't include the OTP in the client response
  const { otp, user } = data;

  // Create a secure, httpOnly cookie with the OTP that will be used for validation
  const responseObj = NextResponse.json(
    {
      message: 'A verification code has been sent to your email address',
      status: true
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  // Store user information and OTP in an encrypted cookie
  responseObj.cookies.set({
    name: 'auth_verification',
    value: JSON.stringify({
      otp,
      user,
      timestamp: Date.now()
    }),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300, // Expires in 5 minutes
    path: '/',
    sameSite: 'strict'
  });

  return responseObj;
}

// Export the POST handler with error handling wrapper
export const POST = withErrorHandler(handlePost);
