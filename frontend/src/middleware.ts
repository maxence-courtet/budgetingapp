import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let Auth0 SDK handle /api/auth/* routes (login, callback, logout, etc.)
  // But skip /api/auth/token which is our own route handler
  if (pathname.startsWith('/api/auth/') && pathname !== '/api/auth/token') {
    return auth0.middleware(req);
  }

  // Check for Auth0 session cookie (v4 default: __session, legacy: appSession)
  const hasSession = req.cookies.get('__session')?.value || req.cookies.get('appSession')?.value;

  if (hasSession) {
    return NextResponse.next();
  }

  // Redirect to Auth0 login
  const loginUrl = new URL('/api/auth/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
