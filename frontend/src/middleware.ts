import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Allow auth routes and token endpoint through
  if (pathname.startsWith('/auth/') || pathname === '/api/auth/token') {
    return NextResponse.next();
  }

  // Check for Auth0 session cookie (v4 default: __session, legacy: appSession)
  const hasSession = req.cookies.get('__session')?.value || req.cookies.get('appSession')?.value;

  if (hasSession) {
    return NextResponse.next();
  }

  // If there's an auth error param, show it instead of redirect-looping
  if (searchParams.get('error')) {
    return NextResponse.next();
  }

  // Redirect to Auth0 login
  const loginUrl = new URL('/auth/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
