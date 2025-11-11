'use server';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Get the auth token cookie
    const cookieStore = await cookies();
    const authTokenCookie = cookieStore.get('auth_token');


    // Check if the auth token exists
    if (!authTokenCookie || !authTokenCookie.value) {
      return NextResponse.json(
        {
          isAuthenticated: false,
          message: 'Not authenticated'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Parse the token data
    try {
      const authData = JSON.parse(authTokenCookie.value);

      // Here you could add additional validation if needed
      // For example, check if the token is expired
      const now = Date.now();
      const issuedAt = authData.issuedAt || 0;
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours (updated from 24 hours)

      if (now - issuedAt > maxAge) {
        // Token expired
        cookieStore.delete('auth_token');
        return NextResponse.json(
          {
            isAuthenticated: false,
            message: 'Session expired'
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }

      // Return user data
      return NextResponse.json(
        {
          isAuthenticated: true,
          user: {
            userId: authData.userId,
            role: authData.role,
            email: authData.email
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    } catch (error) {
      console.error('Error parsing auth token:', error);
      return NextResponse.json(
        {
          isAuthenticated: false,
          message: 'Invalid session'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json(
      {
        isAuthenticated: false,
        message: 'Error checking authentication',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
