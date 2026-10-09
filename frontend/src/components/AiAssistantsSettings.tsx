"use client";

import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "@/components/PreferencesProvider";
import { PlanChip, UpgradeCard } from "@/components/PlanGate";
import { Check, Copy, KeyRound, Link2, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const EXPIRY_OPTIONS = [
  { label: "30 days", seconds: 30 * 86400 },
  { label: "90 days", seconds: 90 * 86400 },
  { label: "1 year", seconds: 365 * 86400 },
  { label: "Never", seconds: null },
] as const;

interface Token {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  lastRequest: string | Date | null;
}

interface ConnectedApp {
  id: string;
  name: string;
  uri: string | null;
  connectedAt: string;
}

const inputClass =
  "w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent";
const subheading = "font-mono text-[11px] text-muted uppercase tracking-[0.08em]";

function formatDate(value: string | Date | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-line-strong rounded-xl text-fg hover:bg-surface-2 transition-colors"
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function AiAssistantsSettings() {
  const { entitlements, websiteUrl } = usePreferences();
  const [mcpUrl, setMcpUrl] = useState("");
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [apps, setApps] = useState<ConnectedApp[] | null>(null);
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<number>(1);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await authClient.apiKey.list();
    setTokens((data?.apiKeys as Token[] | undefined) ?? []);
    const res = await fetch("/api/connected-apps");
    setApps(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    setMcpUrl(`${window.location.origin}/api/mcp`);
    load();
  }, [load]);

  async function createToken(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.apiKey.create({
      name: name.trim() || "AI assistant",
      expiresIn: EXPIRY_OPTIONS[expiry].seconds ?? undefined,
    });
    setBusy(false);
    if (error || !data) {
      setError(error?.message || "Could not create the token");
      return;
    }
    setNewToken(data.key);
    setName("");
    load();
  }

  async function revokeToken(id: string) {
    await authClient.apiKey.delete({ keyId: id });
    load();
  }

  async function disconnectApp(id: string) {
    await fetch(`/api/connected-apps?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  if (!entitlements.mcp) {
    return (
      <section aria-labelledby="ai-heading" className="bg-surface border border-line rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 id="ai-heading" className="text-[15px] font-semibold text-fg">AI assistants</h2>
        <UpgradeCard
          compact
          title="Connect your AI assistant"
          text="Let Claude, ChatGPT or any assistant that supports MCP read and add to your Hive data. Part of Hive Plus."
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="ai-heading" className="bg-surface border border-line rounded-2xl p-5 sm:p-6 space-y-6">
      <div>
        <h2 id="ai-heading" className="text-[15px] font-semibold text-fg">AI assistants</h2>
        <p className="text-sm text-muted mt-1">
          Let Claude, ChatGPT or any assistant that supports MCP read and add to your Hive data.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className={subheading}>Server address</h3>
        <div className="flex gap-2">
          <input readOnly value={mcpUrl} aria-label="MCP server address" className={`${inputClass} font-mono`} />
          <CopyButton value={mcpUrl} label="Copy" />
        </div>
        <p className="text-sm text-muted">
          Add it as a custom connector (or remote MCP server) in your assistant. Most assistants then open Hive so you
          can sign in and approve access. If yours asks for a token instead, create one below.{" "}
          <a href={`${websiteUrl}/connect/`} target="_blank" rel="noopener" className="text-accent font-medium hover:underline">
            Step-by-step guide for Claude and ChatGPT
          </a>
        </p>
      </div>

      <div className="space-y-3">
        <h3 className={subheading}>Connected assistants</h3>
        {apps === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : apps.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-line border border-line rounded-xl">
            {apps.map((app) => (
              <li key={app.id} className="flex items-center gap-3 px-4 py-3">
                <Link2 size={16} className="text-muted shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{app.name}</p>
                  <p className="text-xs text-muted">Connected {formatDate(app.connectedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => disconnectApp(app.id)}
                  className="text-sm font-medium text-muted hover:text-neg transition-colors"
                >
                  Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className={`${subheading} flex items-center gap-2`}>
          Personal tokens {!entitlements.apiTokens && <PlanChip plan="PRO" />}
        </h3>
        {!entitlements.apiTokens && (
          <p className="text-sm text-muted">
            Tokens for assistants and your own automations come with Hive Pro. On your plan, sign in with Hive from your
            assistant instead.
          </p>
        )}

        {newToken && (
          <div role="status" className="border border-accent bg-accent-soft rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-fg">Copy your token now. It won&apos;t be shown again.</p>
            <div className="flex gap-2">
              <input readOnly value={newToken} aria-label="New token" className={`${inputClass} font-mono`} />
              <CopyButton value={newToken} label="Copy" />
            </div>
            <p className="text-xs text-muted">
              Send it as <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>. Anyone with it can read
              and change your data, so keep it private.
            </p>
            <button type="button" onClick={() => setNewToken(null)} className="text-sm font-medium text-accent hover:underline">
              Done
            </button>
          </div>
        )}

        {entitlements.apiTokens && <form onSubmit={createToken} className="flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. Claude Code on my laptop"
            aria-label="Token name"
            className={inputClass}
          />
          <select
            value={expiry}
            onChange={(e) => setExpiry(Number(e.target.value))}
            aria-label="Expires after"
            className={`${inputClass} sm:w-32`}
          >
            {EXPIRY_OPTIONS.map((o, i) => (
              <option key={o.label} value={i}>
                {o.seconds ? o.label : "No expiry"}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors"
          >
            <KeyRound size={14} aria-hidden="true" />
            Create token
          </button>
        </form>}
        {error && (
          <p role="alert" className="text-sm text-neg">
            {error}
          </p>
        )}

        {tokens && tokens.length > 0 && (
          <ul className="divide-y divide-line border border-line rounded-xl">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <KeyRound size={16} className="text-muted shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{t.name || "Token"}</p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{t.start ? `${t.start}…` : ""}</span> · Created {formatDate(t.createdAt)}
                    {t.lastRequest ? ` · Last used ${formatDate(t.lastRequest)}` : " · Never used"}
                    {t.expiresAt ? ` · Expires ${formatDate(t.expiresAt)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeToken(t.id)}
                  aria-label={`Revoke ${t.name || "token"}`}
                  className="p-2 rounded-lg text-muted hover:text-neg hover:bg-surface-2 transition-colors"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
