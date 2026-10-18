import { backend, deleteAuthUser, sessionUser } from "@/lib/account";

// Deletes the signed-in user's account and all their data (GDPR art. 17, nFADP art. 32): the app data in the
// backend first, then the sign-in account.
export async function POST(request: Request) {
  const me = await sessionUser(request);
  if (!me) return Response.json({ error: "Sign in first" }, { status: 401 });

  const res = await backend("/me", me.token, { method: "DELETE" });
  // 404: the backend never saw this user (signed up, never opened the app); there is nothing to delete there.
  if (!res.ok && res.status !== 404) return Response.json({ error: "Could not delete your data, try again" }, { status: 502 });

  await deleteAuthUser(me.user.id);
  return new Response(null, { status: 204 });
}
