import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the path of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || path.startsWith('/api/');

  // Check if user is authenticated by looking for the auth_token cookie
  const authToken = request.cookies.get('auth_token')?.value;
  const isAuthenticated = !!authToken;

  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!isAuthenticated && !isPublicPath) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', path);
    return NextResponse.redirect(url);
  }

  // If the user is authenticated and trying to access login page, redirect to dashboard
  if (isAuthenticated && isPublicPath && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    // Match all routes except for static files, images, API routes, and favicon
    '/((?!_next/static|_next/image|favicon.ico|api/).*)'
  ],
};
