import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { API_KEY_PREFIX, getAuth, mcpResourceUrl } from "@/lib/auth";
import { withBackendToken } from "@/mcp/client";
import { createHiveMcpServer } from "@/mcp/server";

// Hosted MCP endpoint: any AI assistant connects to <app>/api/mcp, either by signing in with Hive (OAuth)
// or with a personal access token from Settings. Each request acts as that user.
//
// Stateless serving answers both current (2026-07-28) and older (2025) MCP clients without sessions.
const mcpHandler = createMcpHandler(() => createHiveMcpServer(), { legacy: "stateless" });

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

/** What the user's plan allows; assistants need a plan with MCP, personal tokens a plan with tokens. */
async function planAllows(token: string, viaApiKey: boolean): Promise<string | null> {
  const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return "Could not check your Hive plan";
  const me = await res.json();
  if (!me.entitlements?.mcp) return "Connecting an AI assistant needs an active Hive trial or plan. Choose a plan in Settings.";
  if (viaApiKey && !me.entitlements?.apiTokens) return "Personal access tokens are part of Hive Pro. Sign in with Hive from your assistant instead.";
  return null;
}

function planRequired(message: string) {
  return Response.json({ jsonrpc: "2.0", error: { code: -32003, message }, id: null }, { status: 403 });
}

async function serveAs(request: Request, userId: string, viaApiKey = false): Promise<Response> {
  const auth = getAuth();
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.findUserById(userId);
  if (!user) return unauthorized("Unknown user");

  // Same short-lived JWT the web app uses, so the backend sees the same user either way.
  const { token } = await auth.api.signJWT({
    body: { payload: { sub: user.id, email: user.email, emailVerified: user.emailVerified, name: user.name } },
  });
  const denied = await planAllows(token, viaApiKey);
  if (denied) return planRequired(denied);
  return withBackendToken(token, () => mcpHandler.fetch(request));
}

function unauthorized(message: string) {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    { status: 401, headers: { "WWW-Authenticate": `Bearer error="invalid_token"` } }
  );
}

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? request.headers.get("x-api-key") ?? undefined;
}

export async function POST(request: Request) {
  const auth = getAuth();
  const token = bearerToken(request);

  if (token?.startsWith(API_KEY_PREFIX)) {
    const result = await auth.api.verifyApiKey({ body: { key: token } });
    if (!result.valid || !result.key) return unauthorized("Invalid or expired token");
    return serveAs(request, result.key.referenceId, true);
  }

  // Anything else must be an OAuth access token bound to this resource; with none, the 401 tells the
  // client where to sign in.
  return requireMcpAuth(auth, (req, claims) => serveAs(req, claims.sub!), { resource: mcpResourceUrl() })(request);
}
