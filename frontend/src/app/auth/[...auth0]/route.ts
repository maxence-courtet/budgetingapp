import { NextRequest } from 'next/server';
import { getAuth0 } from '@/lib/auth0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return getAuth0().middleware(req);
}

export async function POST(req: NextRequest) {
  return getAuth0().middleware(req);
}
