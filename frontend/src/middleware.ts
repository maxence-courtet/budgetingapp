import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let Auth0 SDK handle /auth/* routes (login, callback, logout)
  if (pathname.startsWith('/auth/')) {
    return auth0.middleware(req);
  }

  // Allow token endpoint through
  if (pathname === '/api/auth/token') {
    return NextResponse.next();
  }

  // Check for Auth0 session cookie (v4 default: __session, chunked: __session__0, legacy: appSession)
  const hasSession = req.cookies.get('__session')?.value
    || req.cookies.get('__session__0')?.value
    || req.cookies.get('appSession')?.value;

  if (hasSession) {
    return NextResponse.next();
  }

  // Redirect to Auth0 login
  const loginUrl = new URL('/auth/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
