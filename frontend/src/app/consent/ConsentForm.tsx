"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { HiveLogo } from "@/components/HiveLogo";

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm who you are",
  profile: "See your name",
  email: "See your email address",
  offline_access: "Stay connected until you disconnect it",
};

export function ConsentForm({
  clientName,
  clientUri,
  email,
  scopes,
}: {
  clientName: string;
  clientUri?: string;
  email: string;
  scopes: string[];
}) {
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setBusy(accept ? "allow" : "deny");
    setError(null);
    // On success the response redirects back to the assistant (handled by the auth client).
    const { error } = await authClient.oauth2.consent({ accept });
    if (error) {
      setError(error.message || "Something went wrong");
      setBusy(null);
    }
  }

  const host = clientUri ? safeHost(clientUri) : null;
  const extraScopes = scopes.filter((s) => SCOPE_LABELS[s]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6 space-y-5">
        <HiveLogo size={32} />
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-fg">Connect {clientName} to Hive?</h1>
          {host && <p className="text-xs text-muted">{host}</p>}
        </div>

        <div className="space-y-2 text-sm text-fg-2">
          <p>
            {clientName} will be able to <strong className="text-fg">read and add to</strong> your Hive data: money,
            investments, habits, fitness, goals and notes.
          </p>
          {extraScopes.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-muted">
              {extraScopes.map((s) => (
                <li key={s}>{SCOPE_LABELS[s]}</li>
              ))}
            </ul>
          )}
          <p className="text-muted">
            Signed in as <span className="text-fg">{email}</span>. You can disconnect it at any time in Settings.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-neg">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => respond(false)}
            disabled={busy !== null}
            className="flex-1 px-4 py-2 text-sm font-medium border border-line-strong rounded-xl text-fg hover:bg-surface-2 disabled:opacity-60 transition-colors"
          >
            {busy === "deny" ? "Cancelling…" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            disabled={busy !== null}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors"
          >
            {busy === "allow" ? "Connecting…" : "Allow"}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeHost(uri: string) {
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}
