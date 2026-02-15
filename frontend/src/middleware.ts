import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

function generateSessionToken(user: string, pass: string): string {
  return createHash('sha256').update(`${user}:${pass}`).digest('hex');
}

export function middleware(req: NextRequest) {
  const authUser = process.env.AUTH_USER;
  const authPass = process.env.AUTH_PASSWORD;

  // Skip auth if no credentials configured
  if (!authUser || !authPass) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // Allow login page and auth API routes without authentication
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = req.cookies.get('budget_session')?.value;
  const expectedToken = generateSessionToken(authUser, authPass);

  if (sessionCookie === expectedToken) {
    return NextResponse.next();
  }

  // Redirect to login page
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
