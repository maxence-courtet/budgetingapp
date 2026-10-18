import { authRecords, backend, sessionUser } from "@/lib/account";

// Everything Hive holds about the signed-in user, as one JSON download (GDPR art. 15 and 20, nFADP art. 25 and 28).
export async function GET(request: Request) {
  const me = await sessionUser(request);
  if (!me) return Response.json({ error: "Sign in first" }, { status: 401 });

  const res = await backend("/me/export", me.token);
  if (!res.ok) return Response.json({ error: "Could not export your data, try again" }, { status: 502 });
  const data = await res.json();

  const body = JSON.stringify({ ...data, signIn: await authRecords(me.user.id) }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hive-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
