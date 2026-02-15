import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const authUser = process.env.AUTH_USER;
  const authPass = process.env.AUTH_PASSWORD;

  // Skip auth if no credentials configured
  if (!authUser || !authPass) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      // Compare base64-encoded values directly to avoid decoding issues
      const expected = Buffer.from(`${authUser}:${authPass}`).toString('base64');
      if (encoded === expected) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Budget App"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
