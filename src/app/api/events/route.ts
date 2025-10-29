import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { withErrorHandler } from '@/lib/auth';

// Get environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

async function handleGet(request: Request) {
  // Check if user is authenticated
  const cookieStore = cookies();
  const authTokenCookie = cookieStore.get('auth_token');

  if (!authTokenCookie || !authTokenCookie.value) {
    return NextResponse.json(
      {
        message: 'Unauthorized. Please log in.',
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

  // Verify auth token is valid
  try {
    const authData = JSON.parse(authTokenCookie.value);
    const now = Date.now();

    // Check if token has expired (2 hours)
    if (now - authData.issuedAt > 60 * 60 * 2 * 1000) {
      return NextResponse.json(
        {
          message: 'Session expired. Please log in again.',
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
  } catch (e) {
    return NextResponse.json(
      {
        message: 'Invalid session. Please log in again.',
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

  // Create auth string for external API
  const authString = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64');

  // Fetch events from external API
  const response = await fetch(`${API_BASE_URL}/events/get/all`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Accept': 'application/json'
    },
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
        message: 'Invalid response from events service',
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

  // Return the events data
  return NextResponse.json(data, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// Export the GET handler with error handling wrapper
export const GET = withErrorHandler(handleGet);

