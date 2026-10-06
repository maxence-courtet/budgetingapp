import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth endpoints, the login page and the healthcheck are public
  if (pathname.startsWith('/api/auth/') || pathname === '/login' || pathname === '/api/health') {
    return NextResponse.next();
  }

  // Cheap presence check only; the session itself is validated when /api/auth/token issues a JWT
  if (getSessionCookie(req)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)'],
};
