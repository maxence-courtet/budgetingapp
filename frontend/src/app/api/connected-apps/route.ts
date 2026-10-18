import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

// AI assistants the user connected by signing in with Hive (OAuth consents), for Settings.

export async function GET() {
  const auth = getAuth();
  const h = await headers();
  if (!(await auth.api.getSession({ headers: h }))) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const consents = await auth.api.getOAuthConsents({ headers: h });
  const apps = await Promise.all(
    consents.map(async (consent) => {
      const client = await auth.api
        .getOAuthClientPublic({ query: { client_id: consent.clientId }, headers: h })
        .catch(() => null);
      return {
        id: consent.id,
        name: client?.client_name || "AI assistant",
        uri: client?.client_uri ?? null,
        connectedAt: consent.createdAt,
      };
    })
  );
  return NextResponse.json(apps);
}

export async function DELETE(request: Request) {
  const auth = getAuth();
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const consent = await auth.api.getOAuthConsent({ query: { id }, headers: h }).catch(() => null);
  if (!consent) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await auth.api.deleteOAuthConsent({ body: { id }, headers: h });
  // Removing consent alone only stops new sign-ins; also drop the refresh tokens so the assistant loses
  // access once its current (short-lived) access token expires.
  const ctx = await auth.$context;
  await ctx.adapter.deleteMany({
    model: "oauthRefreshToken",
    where: [
      { field: "userId", value: session.user.id },
      { field: "clientId", value: consent.clientId },
    ],
  });
  return new NextResponse(null, { status: 204 });
}
