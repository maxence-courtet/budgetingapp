"use client";

import { usePathname } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
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

/** Pages of modules the plan doesn't include show an upgrade card instead (the API refuses them too). */
export function PlanGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loaded, canUse } = usePreferences();
  const item = ITEMS.find((i) => matchesPath(i, pathname) || pathname.startsWith(`${i.href}/`));
  if (!loaded || !item?.module || canUse(item.module)) return <>{children}</>;
  return (
    <div className="max-w-2xl">
      <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-fg mb-5">{item.label}</h1>
      <UpgradeCard
        title={`${item.label} is part of Hive Plus`}
        text={`${item.description}. Upgrade to turn it on; anything you saved here before is kept.`}
      />
    </div>
  );
}
