import { NextRequest } from 'next/server';
import { getAuth0 } from '@/lib/auth0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  // Log all env var keys to see what Railway actually injects
  const allKeys = Object.keys(process.env).filter(k => k.startsWith('AUTH') || k.startsWith('APP'));
  console.log('ALL AUTH/APP ENV KEYS:', allKeys);
  console.log('AUTH0_DOMAIN type:', typeof process.env['AUTH0_DOMAIN'], 'value:', JSON.stringify(process.env['AUTH0_DOMAIN']));
  console.log('AUTH0_CLIENT_ID type:', typeof process.env['AUTH0_CLIENT_ID'], 'value:', JSON.stringify(process.env['AUTH0_CLIENT_ID']));
  return getAuth0().middleware(req);
}
