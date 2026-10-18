// Railway healthcheck: must answer 200 without a session (every other page redirects to login).
export function GET() {
  return Response.json({ status: "ok" });
}
