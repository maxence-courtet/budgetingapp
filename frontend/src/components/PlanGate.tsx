"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Sparkles, HeartPulse } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { lifeItems, moneyItems, matchesPath } from "@/lib/nav";
import { PLAN_NAMES, PlanId } from "@/lib/plans";

/** A small "Plus" / "Pro" chip for things the user's plan doesn't include. */
export function PlanChip({ plan }: { plan: PlanId }) {
  return (
    <span className="inline-flex items-center gap-1 h-5 px-1.5 rounded-md bg-accent-soft text-accent-strong font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
      <Lock size={10} aria-hidden="true" />
      {PLAN_NAMES[plan]}
    </span>
  );
}

/** Explains that something needs a higher plan, with the way to upgrade. */
export function UpgradeCard({ title, text, plan = "PLUS", compact }: { title: string; text: string; plan?: PlanId; compact?: boolean }) {
  const { upgradeUrl } = usePreferences();
  return (
    <div className={`rounded-2xl border border-accent/40 bg-accent-soft ${compact ? "p-4" : "p-6 sm:p-8"}`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-surface flex items-center justify-center">
          <Sparkles size={18} className="text-accent" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent-strong">Hive {PLAN_NAMES[plan]}</p>
          <h2 className={`${compact ? "text-[15px]" : "text-lg"} font-semibold text-fg mt-0.5`}>{title}</h2>
          <p className="text-sm text-fg-2 mt-1">{text}</p>
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex items-center h-10 px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover"
          >
            See plans
          </a>
        </div>
      </div>
    </div>
  );
}

const ITEMS = [...moneyItems, ...lifeItems].filter((i) => i.module);

/** Explicit consent before the Fitness module stores health data (nFADP art. 6(7), GDPR art. 9(2)(a)). */
function HealthConsent() {
  const { setHealthConsent, websiteUrl } = usePreferences();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function give() {
    setBusy(true);
    setError("");
    try {
      await setHealthConsent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your consent");
      setBusy(false);
    }
  }
  return (
    <div className="max-w-2xl">
      <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-fg mb-5">Fitness</h1>
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 space-y-4">
        <span className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
          <HeartPulse size={18} className="text-accent" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-fg">Before you log fitness data</h2>
        <p className="text-sm text-fg-2">
          Weight, body measurements and workouts are health data, which the law treats as sensitive. Hive only stores them
          with your explicit consent, uses them only to show you your progress, and never shares them. You can withdraw
          consent in Settings at any time; your fitness data is then deleted.
        </p>
        <label className="flex items-start gap-3 text-sm text-fg">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--accent)]" />
          <span>
            I agree that Hive stores the health data I enter in Fitness, as described in the{" "}
            <a href={`${websiteUrl}/legal/privacy/`} target="_blank" rel="noopener" className="text-accent underline">
              privacy policy
            </a>
            .
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-neg">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={give}
          disabled={!checked || busy}
          className="h-10 px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : "Agree and continue"}
        </button>
      </div>
    </div>
  );
}

/** Shown on every page but Settings once the trial or plan has ended. */
function AccessEnded() {
  const { trial, upgradeUrl } = usePreferences();
  return (
    <div className="max-w-2xl">
      <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-fg mb-5">
        {trial ? "Your free month has ended" : "Your plan has ended"}
      </h1>
      <div className="rounded-2xl border border-accent/40 bg-accent-soft p-6 sm:p-8 space-y-3">
        <p className="text-fg-2">
          Thanks for trying Hive. Choose a plan to pick up where you left off: everything you entered is still here.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener"
            className="h-10 px-4 inline-flex items-center rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover"
          >
            Choose a plan
          </a>
          <Link href="/settings#data" className="h-10 px-4 inline-flex items-center rounded-xl border border-line-strong bg-surface text-sm font-medium">
            Export or delete my data
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Pages the plan doesn't include show an upgrade card instead (the API refuses them too); once the trial or
 * plan has ended every page but Settings does; Fitness first asks for consent to store health data.
 */
export function PlanGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loaded, canUse, entitlements, healthConsentAt } = usePreferences();
  if (!loaded) return <>{children}</>;
  if (!entitlements.access && !pathname.startsWith("/settings")) return <AccessEnded />;
  const item = ITEMS.find((i) => matchesPath(i, pathname) || pathname.startsWith(`${i.href}/`));
  if (item?.module && !canUse(item.module)) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-fg mb-5">{item.label}</h1>
        <UpgradeCard
          title={`${item.label} isn't part of your plan`}
          text={`${item.description}. Upgrade to turn it on; anything you saved here before is kept.`}
        />
      </div>
    );
  }
  if (item?.module === "fitness" && !healthConsentAt) return <HealthConsent />;
  return <>{children}</>;
}

/** A quiet reminder in the last week of the free trial (and nothing is charged automatically). */
export function TrialBanner() {
  const { loaded, trial, planExpiresAt, entitlements, upgradeUrl } = usePreferences();
  if (!loaded || !trial || !entitlements.access || !planExpiresAt) return null;
  const daysLeft = Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 7) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
      <span className="flex-1 min-w-[12rem] text-fg-2">
        {daysLeft <= 1 ? "Your free month ends today." : `${daysLeft} days left in your free month.`} Choose a plan to keep
        everything going.
      </span>
      <a href={upgradeUrl} target="_blank" rel="noopener" className="font-semibold text-accent-strong hover:underline">
        See plans
      </a>
    </div>
  );
}
