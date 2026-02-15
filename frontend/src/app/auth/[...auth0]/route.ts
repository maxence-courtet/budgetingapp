import { NextRequest } from 'next/server';
import { auth0 } from '@/lib/auth0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return auth0.middleware(req);
}
