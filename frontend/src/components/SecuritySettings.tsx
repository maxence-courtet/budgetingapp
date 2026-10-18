"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { KeyRound, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const card = "bg-surface border border-line rounded-2xl p-5 sm:p-6";
const inputClass =
  "w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent";
const primary =
  "px-4 py-2 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-60 transition-colors";
const secondary = "px-4 py-2 text-sm font-medium border border-line-strong rounded-xl text-fg hover:bg-surface-2 disabled:opacity-60";

type Step =
  | { kind: "idle" }
  | { kind: "password"; action: "enable" | "disable" | "codes" }
  | { kind: "scan"; uri: string; qr: string; secret: string; backupCodes: string[] }
  | { kind: "codes"; backupCodes: string[] }
  | { kind: "changePassword" };

/** Change password and two-step verification (authenticator app + backup codes). */
export function SecuritySettings() {
  const { data: session, refetch } = authClient.useSession();
  const enabled = Boolean((session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setPassword("");
    setNewPassword("");
    setCode("");
    setError("");
  }, [step.kind]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const fail = (e: { message?: string } | null | undefined) => {
    if (e) throw new Error(e.message || "Something went wrong");
  };

  async function confirmPassword(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== "password") return;
    await run(async () => {
      if (step.action === "enable") {
        const { data, error } = await authClient.twoFactor.enable({ password });
        fail(error);
        if (!data || !("totpURI" in data)) throw new Error("Authenticator setup isn't available");
        const uri = data.totpURI;
        const secret = new URL(uri).searchParams.get("secret") ?? "";
        setStep({ kind: "scan", uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret, backupCodes: data.backupCodes });
      } else if (step.action === "disable") {
        const { error } = await authClient.twoFactor.disable({ password });
        fail(error);
        await refetch();
        setNotice("Two-step verification is off.");
        setStep({ kind: "idle" });
      } else {
        const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
        fail(error);
        setStep({ kind: "codes", backupCodes: data!.backupCodes });
      }
    });
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const { error } = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
      fail(error);
      await refetch();
      setNotice("Two-step verification is on. Keep your backup codes somewhere safe.");
      setStep((s) => (s.kind === "scan" ? { kind: "codes", backupCodes: s.backupCodes } : { kind: "idle" }));
    });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      const { error } = await authClient.changePassword({ currentPassword: password, newPassword, revokeOtherSessions: true });
      fail(error);
      setNotice("Password changed. Other devices have been signed out.");
      setStep({ kind: "idle" });
    });
  }

  function downloadCodes(codes: string[]) {
    const blob = new Blob([`Hive backup codes (each works once)\n\n${codes.join("\n")}\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hive-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section aria-labelledby="security-heading" className={card}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
          <ShieldCheck size={17} className="text-accent" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="security-heading" className="text-[15px] font-semibold text-fg">Sign-in &amp; security</h2>
          <p className="text-sm text-muted mt-1">
            Two-step verification:{" "}
            <strong className={enabled ? "text-pos" : "text-fg"}>{enabled ? "on" : "off"}</strong>
            {enabled ? ". Signing in asks for a code from your authenticator app." : ". Add a code from an authenticator app to every sign-in."}
          </p>
        </div>
      </div>

      {notice && step.kind === "idle" && <p role="status" className="mt-4 text-sm text-fg-2">{notice}</p>}

      {step.kind === "idle" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {enabled ? (
            <>
              <button className={secondary} onClick={() => setStep({ kind: "password", action: "codes" })}>New backup codes</button>
              <button className={secondary} onClick={() => setStep({ kind: "password", action: "disable" })}>Turn off two-step verification</button>
            </>
          ) : (
            <button className={primary} onClick={() => { setNotice(""); setStep({ kind: "password", action: "enable" }); }}>
              Turn on two-step verification
            </button>
          )}
          <button className={secondary} onClick={() => { setNotice(""); setStep({ kind: "changePassword" }); }}>
            <KeyRound size={14} className="inline -mt-0.5 mr-1" aria-hidden="true" />
            Change password
          </button>
        </div>
      )}

      {step.kind === "password" && (
        <form onSubmit={confirmPassword} className="mt-4 space-y-3 max-w-sm">
          <label className="block space-y-1">
            <span className="block text-xs text-muted">Confirm with your password</span>
            <input className={inputClass} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
          </label>
          {error && <p role="alert" className="text-sm text-neg">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primary}>{busy ? "Checking…" : "Continue"}</button>
            <button type="button" className={secondary} onClick={() => setStep({ kind: "idle" })}>Cancel</button>
          </div>
        </form>
      )}

      {step.kind === "scan" && (
        <form onSubmit={confirmCode} className="mt-4 space-y-4">
          <ol className="text-sm text-fg-2 space-y-1 list-decimal pl-5">
            <li>Open an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Proton Pass…).</li>
            <li>Scan this code, or enter the key by hand.</li>
            <li>Type the 6-digit code it shows to finish.</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={step.qr} alt="QR code to add Hive to your authenticator app" width={180} height={180} className="rounded-xl border border-line bg-white p-2" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs text-muted">Key</p>
              <p className="font-mono text-sm break-all text-fg">{step.secret}</p>
            </div>
          </div>
          <label className="block space-y-1 max-w-xs">
            <span className="block text-xs text-muted">6-digit code</span>
            <input className={`${inputClass} font-mono tracking-widest`} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          {error && <p role="alert" className="text-sm text-neg">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primary}>{busy ? "Checking…" : "Turn on"}</button>
            <button type="button" className={secondary} onClick={() => setStep({ kind: "idle" })}>Cancel</button>
          </div>
        </form>
      )}

      {step.kind === "codes" && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-fg-2">
            Backup codes let you sign in if you lose your phone. Each works once. Save them now: they won&apos;t be shown again.
          </p>
          <ul className="grid grid-cols-2 gap-2 max-w-sm font-mono text-sm">
            {step.backupCodes.map((c) => (
              <li key={c} className="rounded-lg bg-surface-2 px-3 py-1.5 text-fg">{c}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button className={primary} onClick={() => downloadCodes(step.backupCodes)}>Download</button>
            <button className={secondary} onClick={() => setStep({ kind: "idle" })}>Done</button>
          </div>
        </div>
      )}

      {step.kind === "changePassword" && (
        <form onSubmit={changePassword} className="mt-4 space-y-3 max-w-sm">
          <label className="block space-y-1">
            <span className="block text-xs text-muted">Current password</span>
            <input className={inputClass} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
          </label>
          <label className="block space-y-1">
            <span className="block text-xs text-muted">New password (at least 10 characters)</span>
            <input className={inputClass} type="password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </label>
          {error && <p role="alert" className="text-sm text-neg">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primary}>{busy ? "Saving…" : "Change password"}</button>
            <button type="button" className={secondary} onClick={() => setStep({ kind: "idle" })}>Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
