import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours, must match the cookie maxAge

function isValidToken(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    return typeof data.issuedAt === 'number' && Date.now() - data.issuedAt < TOKEN_MAX_AGE;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicPath = path === '/login' || path.startsWith('/api/');

  const authToken = request.cookies.get('auth_token')?.value;
  const isAuthenticated = isValidToken(authToken);

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
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)'
  ],
};
