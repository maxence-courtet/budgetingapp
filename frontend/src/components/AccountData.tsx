"use client";

import { useState } from "react";
import { Download, Trash2, HeartPulse, ExternalLink, BookOpen, FileText, Shield, Building2 } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { authClient } from "@/lib/auth-client";

const card = "bg-surface border border-line rounded-2xl p-5 sm:p-6";

/** Export, health-data consent and account deletion: the user's data rights in one place. */
export function YourData() {
  const { healthConsentAt, setHealthConsent } = usePreferences();
  const [busy, setBusy] = useState<"export" | "consent" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function exportData() {
    setBusy("export");
    setError("");
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hive-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function withdraw() {
    setBusy("consent");
    setError("");
    try {
      await setHealthConsent(false);
      setConfirmWithdraw(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't withdraw consent");
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    setBusy("delete");
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Deletion failed");
      await authClient.signOut().catch(() => undefined);
      window.location.href = "/login";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed");
      setBusy(null);
    }
  }

  const consentDate = healthConsentAt ? new Date(healthConsentAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <section id="data" aria-labelledby="data-heading" className={`${card} space-y-5 scroll-mt-20`}>
      <div>
        <h2 id="data-heading" className="text-[15px] font-semibold text-fg">Your data</h2>
        <p className="text-sm text-muted mt-1">Everything you store in Hive belongs to you.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[14rem]">
          <p className="text-sm font-medium text-fg">Download your data</p>
          <p className="text-xs text-muted">A JSON file with your accounts, transactions, plans, habits, fitness, goals, notes and sign-in details.</p>
        </div>
        <button
          type="button"
          onClick={exportData}
          disabled={busy !== null}
          className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-line-strong text-sm font-medium text-fg hover:border-accent disabled:opacity-60"
        >
          <Download size={15} aria-hidden="true" />
          {busy === "export" ? "Preparing…" : "Download"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-line">
        <HeartPulse size={18} className="text-muted shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-[14rem]">
          <p className="text-sm font-medium text-fg">Health data consent</p>
          <p className="text-xs text-muted">
            {consentDate
              ? `Given on ${consentDate} for the Fitness module (weight, measurements, workouts).`
              : "Not given. Fitness asks for it before storing any health data."}
          </p>
        </div>
        {consentDate &&
          (confirmWithdraw ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">This deletes your fitness entries and plans.</span>
              <button type="button" onClick={() => setConfirmWithdraw(false)} className="h-9 px-3 rounded-lg border border-line-strong text-sm">
                Keep
              </button>
              <button
                type="button"
                onClick={withdraw}
                disabled={busy !== null}
                className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60"
              >
                Withdraw and delete
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmWithdraw(true)} className="text-sm font-medium text-neg hover:underline">
              Withdraw consent
            </button>
          ))}
      </div>

      <div className="pt-5 border-t border-line">
        {!deleting ? (
          <button type="button" onClick={() => setDeleting(true)} className="inline-flex items-center gap-2 text-sm font-medium text-neg hover:underline">
            <Trash2 size={15} aria-hidden="true" />
            Delete my account
          </button>
        ) : (
          <div className="rounded-xl border border-red-300 p-4 space-y-3">
            <p className="text-sm text-fg">
              This permanently deletes your account and everything in it. It can&apos;t be undone. Download your data first if
              you want a copy.
            </p>
            <label className="block text-sm text-fg-2">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                autoComplete="off"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleting(false);
                  setConfirmText("");
                }}
                className="h-10 px-4 rounded-xl border border-line-strong text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={confirmText !== "DELETE" || busy !== null}
                className="h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy === "delete" ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-neg">
          {error}
        </p>
      )}
    </section>
  );
}

/** Links to the public website: the assistant setup guide and the legal pages. */
export function HelpAndLegal() {
  const { websiteUrl } = usePreferences();
  const links = [
    { href: `${websiteUrl}/connect/`, label: "Connect your AI assistant: step-by-step guide", icon: BookOpen },
    { href: `${websiteUrl}/legal/terms/`, label: "Terms of service", icon: FileText },
    { href: `${websiteUrl}/legal/privacy/`, label: "Privacy policy", icon: Shield },
    { href: `${websiteUrl}/legal/notice/`, label: "Legal notice", icon: Building2 },
  ];
  return (
    <section aria-labelledby="legal-heading" className={card}>
      <h2 id="legal-heading" className="text-[15px] font-semibold text-fg">Help &amp; legal</h2>
      <ul role="list" className="mt-3 divide-y divide-line">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener" className="flex items-center gap-3 py-3 text-sm text-fg-2 hover:text-fg">
              <Icon size={16} className="text-muted shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              <ExternalLink size={14} className="text-faint" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
