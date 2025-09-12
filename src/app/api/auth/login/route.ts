import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/utils';

// Get environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

// Store OTP request timestamps to implement rate limiting - export it to be accessible in logout route
export const otpRequestLog = new Map<string, {
  timestamp: number,
  count: number,
  blockedUntil: number | null,
  backoffTime: number // Time in ms to wait before next request
}>();

// Rate limit configuration
const INITIAL_BACKOFF = 60 * 1000; // Start with 1 minute (60 seconds)
const MAX_REQUESTS = 5; // Block after 5 requests
const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block

async function handlePost(request: Request) {
  // Get the request body
  const body = await request.json();
  const { id: identifier } = body;

  // Implement rate limiting for OTP requests
  if (identifier) {
    const now = Date.now();
    const requestLog = otpRequestLog.get(identifier);

    if (requestLog) {
      // Check if the user is blocked
      if (requestLog.blockedUntil && now < requestLog.blockedUntil) {
        const remainingBlockTime = Math.ceil((requestLog.blockedUntil - now) / 60000); // in minutes
        return NextResponse.json(
          {
            message: `Too many OTP requests. Please try again in ${remainingBlockTime} minute${remainingBlockTime > 1 ? 's' : ''}.`,
            status: false
          },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Not blocked, but check timing
      if (now - requestLog.timestamp < requestLog.backoffTime) {
        // They're trying too quickly, tell them to wait
        const waitTime = Math.ceil((requestLog.timestamp + requestLog.backoffTime - now) / 60000); // in minutes
        return NextResponse.json(
          {
            message: `Please wait ${waitTime} minute${waitTime > 1 ? 's' : ''} before requesting another OTP.`,
            status: false
          },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // User waited long enough, process the request
      requestLog.timestamp = now;
      requestLog.count += 1;

      // Increase backoff time exponentially for each subsequent request (doubles each time)
      requestLog.backoffTime = INITIAL_BACKOFF * Math.pow(2, requestLog.count - 1);

      // If they've made too many requests, block them
      if (requestLog.count >= MAX_REQUESTS) {
        requestLog.blockedUntil = now + BLOCK_DURATION;

        return NextResponse.json(
          {
            message: 'Too many OTP requests. Your account has been temporarily blocked for 1 hour.',
            status: false
          },
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      otpRequestLog.set(identifier, requestLog);
    } else {
      // First request for this identifier
      otpRequestLog.set(identifier, {
        timestamp: now,
        count: 1,
        blockedUntil: null,
        backoffTime: INITIAL_BACKOFF
      });
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
  // Store the OTP in the session cookie securely so it can be validated server-side
  const { otp, user } = data;

  // Create a secure, httpOnly cookie with the OTP that will be used for validation
  // but won't be accessible via JavaScript on the client
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
    // Store a JSON string with OTP and user info
    value: JSON.stringify({
      otp,
      user,
      timestamp: Date.now() // Add timestamp for expiration checking
    }),
    httpOnly: true, // Not accessible via JavaScript
    secure: process.env.NODE_ENV === 'production', // Only sent over HTTPS in production
    maxAge: 300, // Expires in 5 minutes (300 seconds)
    path: '/',
    sameSite: 'strict'
  });

  return responseObj;
}

// Export the POST handler with error handling wrapper
export const POST = withErrorHandler(handlePost);
