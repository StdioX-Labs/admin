import { NextResponse } from 'next/server';

/**
 * Error handler wrapper for API routes
 * Catches errors and returns proper JSON responses
 */
export function withErrorHandler(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);

      // Handle different types of errors
      if (error instanceof Error) {
        return NextResponse.json(
          {
            message: error.message || 'An error occurred',
            status: false,
          },
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // Handle unknown errors
      return NextResponse.json(
        {
          message: 'An unexpected error occurred',
          status: false,
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

/**
 * Verify if a user is authenticated
 * Returns the auth token data if valid, null otherwise
 */
export function verifyAuth(authToken: string | undefined): Record<string, unknown> | null {
  if (!authToken) {
    return null;
  }

  try {
    const authData = JSON.parse(authToken) as Record<string, unknown>;
    const now = Date.now();

    // Check if token has expired (2 hours)
    const issuedAt = typeof authData.issuedAt === 'number' ? authData.issuedAt : 0;
    if (now - issuedAt > 60 * 60 * 2 * 1000) {
      return null;
    }

    return authData;
  } catch {
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(authData: Record<string, unknown> | null, requiredRole: string): boolean {
  return authData?.role === requiredRole;
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(authData: Record<string, unknown> | null): boolean {
  return hasRole(authData, 'SUPER_ADMIN');
}

