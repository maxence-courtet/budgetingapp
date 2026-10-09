import { getAuth } from "@/lib/auth";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

/** The signed-in user for a request, with a short-lived backend JWT for them; null when signed out. */
export async function sessionUser(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const { user } = session;
  const { token } = await auth.api.signJWT({
    body: { payload: { sub: user.id, email: user.email, emailVerified: user.emailVerified, name: user.name } },
  });
  return { user, token };
}

export function backend(path: string, token: string, init?: RequestInit) {
  return fetch(`${API_BASE}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
}

type Where = { field: string; value: string }[];

/** Sign-in records the auth service keeps about a user (never passwords, tokens or keys). */
export async function authRecords(userId: string) {
  const ctx = await getAuth().$context;
  const find = (model: string, where: Where) => ctx.adapter.findMany<Record<string, unknown>>({ model, where }).catch(() => []);
  const pick = (rows: Record<string, unknown>[], keys: string[]) => rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
  const byUser: Where = [{ field: "userId", value: userId }];
  return {
    user: await ctx.internalAdapter.findUserById(userId),
    signInMethods: pick(await find("account", byUser), ["providerId", "createdAt", "updatedAt"]),
    sessions: pick(await find("session", byUser), ["createdAt", "expiresAt", "ipAddress", "userAgent"]),
    personalAccessTokens: pick(await find("apikey", [{ field: "referenceId", value: userId }]), ["name", "start", "createdAt", "expiresAt", "lastRequest"]),
    connectedAssistants: pick(await find("oauthConsent", byUser), ["clientId", "scopes", "createdAt", "updatedAt"]),
  };
}

/** Erases the user's sign-in data: tokens, assistant approvals, sessions, linked accounts and the user. */
export async function deleteAuthUser(userId: string) {
  const ctx = await getAuth().$context;
  const del = (model: string, where: Where) => ctx.adapter.deleteMany({ model, where }).catch(() => 0);
  const byUser: Where = [{ field: "userId", value: userId }];
  await del("apikey", [{ field: "referenceId", value: userId }]);
  await del("oauthAccessToken", byUser);
  await del("oauthRefreshToken", byUser);
  await del("oauthConsent", byUser);
  await del("session", byUser);
  await ctx.internalAdapter.deleteAccounts(userId);
  await ctx.internalAdapter.deleteUser(userId);
}
