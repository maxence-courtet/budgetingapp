import { getAuth } from "@/lib/auth";

// OAuth discovery documents (authorization server and MCP protected-resource metadata) are served by the auth
// handler at the site root, where AI assistants look for them; Next only routes /api/auth/* there by
// default, so these routes pass the request through. Public and read-only, so open to any origin.
export async function forwardWellKnown(request: Request) {
  const response = await getAuth().handler(request);
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, { status: response.status, headers });
}
