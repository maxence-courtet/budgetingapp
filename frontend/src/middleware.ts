import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Auth0 routes without session check
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
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
