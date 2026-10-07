"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { HiveLogo } from "@/components/HiveLogo";

const inputClass =
  "w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent";

export function LoginForm({
  googleEnabled,
  initialMode = "signIn",
}: {
  googleEnabled: boolean;
  initialMode?: "signIn" | "signUp";
}) {
  const [mode, setMode] = useState<"signIn" | "signUp">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } =
      mode === "signIn"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
    if (error) {
      setError(error.message || "Something went wrong");
      setBusy(false);
      return;
    }
    // When an AI assistant sent the user here to sign in, the response carries the next step of that
    // flow and the auth client follows it; otherwise go to the app.
    if (data && "redirect" in data && data.redirect) return;
    window.location.href = "/";
  }

  async function google() {
    setError(null);
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-6 space-y-5">
        <HiveLogo size={32} />
        <h1 className="text-lg font-semibold text-fg">
          {mode === "signIn" ? "Sign in" : "Create an account"}
        </h1>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signUp" && (
            <label className="block space-y-1">
              <span className="block text-xs text-muted">Name</span>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </label>
          )}
          <label className="block space-y-1">
            <span className="block text-xs text-muted">Email</span>
            <input
              className={inputClass}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1">
            <span className="block text-xs text-muted">Password</span>
            <input
              className={inputClass}
              type="password"
              required
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-neg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors"
          >
            {busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
          </button>
        </form>

        {googleEnabled && (
          <button
            type="button"
            onClick={google}
            className="w-full px-4 py-2 text-sm font-medium border border-line-strong rounded-xl text-fg hover:bg-surface-2 transition-colors"
          >
            Continue with Google
          </button>
        )}

        <p className="text-sm text-muted">
          {mode === "signIn" ? "No account yet? " : "Already have an account? "}
          <button
            type="button"
            className="text-accent font-medium hover:underline"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {mode === "signIn" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
