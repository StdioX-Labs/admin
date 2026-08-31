import { NextResponse } from 'next/server';

/**
 * How long a console session stays valid. This is the single source of truth —
 * it must match the `maxAge` the cookie is minted with in
 * /api/auth/validate-otp and the window the middleware enforces.
 */
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

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
 * Translate an upstream platform-API status into the one this console should
 * report to the browser.
 *
 * The platform API is called with *service* credentials that have nothing to do
 * with the visitor's session, so its 401/403 says our server-to-server call was
 * rejected — not that the visitor was signed out. Forwarding it verbatim made
 * every page conclude the session had died and tell the user to sign in again,
 * which never helped: signing in mints the same service credentials. A 401 from
 * this console now means one thing only — the console session is missing or
 * expired — and an upstream refusal is reported as the gateway failure it is.
 */
export function upstreamStatus(status: number): number {
  return status === 401 || status === 403 ? 502 : status;
}
