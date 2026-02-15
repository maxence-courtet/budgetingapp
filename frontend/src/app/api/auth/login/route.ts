import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

function generateSessionToken(user: string, pass: string): string {
  return createHash("sha256").update(`${user}:${pass}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const authUser = process.env.AUTH_USER;
  const authPass = process.env.AUTH_PASSWORD;

  if (!authUser || !authPass) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { username, password } = body;

  if (username === authUser && password === authPass) {
    const token = generateSessionToken(authUser, authPass);
    const response = NextResponse.json({ success: true });
    response.cookies.set("budget_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return response;
  }

  return NextResponse.json(
    { error: "Invalid username or password" },
    { status: 401 }
  );
}
