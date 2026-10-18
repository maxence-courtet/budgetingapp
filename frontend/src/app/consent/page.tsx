import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { getAuth } from "@/lib/auth";
import { ConsentForm } from "./ConsentForm";

export const dynamic = "force-dynamic";

// Shown when an AI assistant asks for access to the user's Hive account (OAuth consent).
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }

  const auth = getAuth();
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login");

  const { secret } = await auth.$context;
  const clientId = params.get("client_id");
  if (!clientId || !(await verifyOAuthQueryParams(params.toString(), secret))) {
    return <ConsentError />;
  }

  const client = await auth.api
    .getOAuthClientPublic({ query: { client_id: clientId }, headers: requestHeaders })
    .catch(() => null);
  if (!client) return <ConsentError />;

  return (
    <ConsentForm
      clientName={client.client_name || "An AI assistant"}
      clientUri={client.client_uri ?? undefined}
      email={session.user.email}
      scopes={(params.get("scope") ?? "").split(" ").filter(Boolean)}
    />
  );
}

function ConsentError() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6 space-y-2">
        <h1 className="text-lg font-semibold text-fg">This link has expired</h1>
        <p className="text-sm text-muted">Go back to your AI assistant and connect Hive again.</p>
      </div>
    </div>
  );
}
