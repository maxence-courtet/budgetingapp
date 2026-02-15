import { getAuth0 } from '@/lib/auth0';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { token } = await getAuth0().getAccessToken();
    return NextResponse.json({ accessToken: token });
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
