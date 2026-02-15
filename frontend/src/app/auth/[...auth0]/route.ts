import { NextRequest } from 'next/server';
import { getAuth0 } from '@/lib/auth0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  console.log('AUTH0 ENV DEBUG:', {
    AUTH0_DOMAIN: process.env['AUTH0_DOMAIN'] ?? 'MISSING',
    AUTH0_CLIENT_ID: process.env['AUTH0_CLIENT_ID'] ?? 'MISSING',
    APP_BASE_URL: process.env['APP_BASE_URL'] ?? 'MISSING',
    AUTH0_SECRET: process.env['AUTH0_SECRET'] ? 'SET' : 'MISSING',
    AUTH0_CLIENT_SECRET: process.env['AUTH0_CLIENT_SECRET'] ? 'SET' : 'MISSING',
  });
  return getAuth0().middleware(req);
}
