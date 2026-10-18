"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { HiveLogo } from "@/components/HiveLogo";

const inputClass =
  "w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent";

/** Opened from the "Reset your password" link: choose a new password. */
export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setToken(q.get("token"));
    setLinkError(q.has("error") || !q.get("token"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match");
    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);
    if (error) return setError(error.message || "Something went wrong");
    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6 space-y-5">
        <HiveLogo size={32} />
        <h1 className="text-lg font-semibold text-fg">Choose a new password</h1>
        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-2">Your password has been changed, and you&apos;ve been signed out everywhere else.</p>
            <a href="/login" className="block w-full text-center px-4 py-2 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover">
              Sign in
            </a>
          </div>
        ) : linkError ? (
          <div className="space-y-3">
            <p className="text-sm text-fg-2">This link is invalid or has expired (links work for one hour). Ask for a new one.</p>
            <a href="/login" className="text-sm text-accent font-medium hover:underline">Back to sign in</a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block space-y-1">
              <span className="block text-xs text-muted">New password (at least 10 characters)</span>
              <input className={inputClass} type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </label>
            <label className="block space-y-1">
              <span className="block text-xs text-muted">Repeat it</span>
              <input className={inputClass} type="password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </label>
            {error && <p role="alert" className="text-sm text-neg">{error}</p>}
            <button type="submit" disabled={busy} className="w-full px-4 py-2 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors">
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
