import { NextRequest, NextResponse } from 'next/server';

async function generateSessionToken(user: string, pass: string): Promise<string> {
  const data = new TextEncoder().encode(`${user}:${pass}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
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
  const expectedToken = await generateSessionToken(authUser, authPass);

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
