import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

// The browser exchanges its session cookie for a short-lived JWT to call the backend with.
export async function GET() {
  try {
    const { token } = await getAuth().api.getToken({ headers: await headers() });
    return NextResponse.json({ accessToken: token });
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
}
