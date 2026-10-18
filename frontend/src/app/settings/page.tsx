"use client";

import Link from "next/link";
import { useState } from "react";
import { Sun, Moon, Monitor, Check, ChevronRight, Play, Coins } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { Switch } from "@/components/Welcome";
import { PlanChip } from "@/components/PlanGate";
import { MODULE_PLAN, PLAN_NAMES } from "@/lib/plans";
import { moduleItems, setupItems, ALL_MODULES, ModuleId } from "@/lib/nav";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppearance } from "@/components/AppearanceProvider";
import { ACCENTS, ThemePref } from "@/lib/appearance";
import { AiAssistantsSettings } from "@/components/AiAssistantsSettings";
import { YourData, HelpAndLegal } from "@/components/AccountData";
import { CURRENCIES } from "@/lib/currencies";

const THEME_OPTIONS: { id: ThemePref; label: string; hint: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", hint: "Always light", icon: Sun },
  { id: "dark", label: "Dark", hint: "Always dark", icon: Moon },
  { id: "system", label: "Auto", hint: "Follows your device", icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme, accent, setAccent, resolvedTheme } = useAppearance();
  const { chosenModules: modules, canUse, save, replayWelcome } = usePreferences();

  function toggle(id: ModuleId) {
    const next = modules.includes(id) ? modules.filter((m) => m !== id) : ALL_MODULES.filter((m) => m === id || modules.includes(m));
    save({ modules: next }).catch(() => undefined);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />

      <PlanSection />

      <section aria-labelledby="setup-heading" className="bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
          <h2 id="setup-heading" className="text-[15px] font-semibold text-fg">Money setup</h2>
          <p className="text-sm text-muted mt-1">The things you set up once and rarely change.</p>
        </div>
        <ul role="list" className="divide-y divide-line border-t border-line">
          {setupItems.map(({ href, label, icon: Icon, description }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5 hover:bg-surface-2 transition-colors">
                <span className="w-9 h-9 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
                  <Icon size={17} className="text-accent" aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-fg">{label}</span>
                  <span className="block text-xs text-muted truncate">{description}</span>
                </span>
                <ChevronRight size={16} className="text-faint" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <CurrencyRow />
          </li>
        </ul>
      </section>

      <section aria-labelledby="modules-heading" className="bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 flex items-start justify-between gap-4">
          <div>
            <h2 id="modules-heading" className="text-[15px] font-semibold text-fg">Your Hive</h2>
            <p className="text-sm text-muted mt-1">Choose what shows in the menu. Turning a module off keeps its data.</p>
          </div>
          <button
            type="button"
            onClick={replayWelcome}
            className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line-strong text-sm font-medium text-fg hover:border-accent"
          >
            <Play size={14} aria-hidden="true" /> Tour
          </button>
        </div>
        <ul role="list" className="divide-y divide-line border-t border-line">
          {moduleItems.map(({ module, label, icon: Icon, description }) => {
            const on = modules.includes(module!);
            return (
              <li key={module}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => toggle(module!)}
                  className="w-full flex items-center gap-3.5 px-5 sm:px-6 py-3.5 text-left hover:bg-surface-2 transition-colors"
                >
                  <Icon size={18} className={on ? "text-accent shrink-0" : "text-faint shrink-0"} aria-hidden="true" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      {label}
                      {!canUse(module!) && <PlanChip plan={MODULE_PLAN} />}
                    </span>
                    <span className="block text-xs text-muted">{description}</span>
                  </span>
                  <Switch on={on} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="appearance-heading" className="bg-surface border border-line rounded-2xl p-5 sm:p-6 space-y-6">
        <div>
          <h2 id="appearance-heading" className="text-[15px] font-semibold text-fg">Appearance</h2>
          <p className="text-sm text-muted mt-1">Saved on this device.</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-3">Theme</legend>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {THEME_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
              const selected = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  aria-pressed={selected}
                  className={`flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border text-center sm:text-left transition-colors ${
                    selected ? "border-accent ring-1 ring-accent bg-accent-soft" : "border-line-strong hover:border-accent"
                  }`}
                >
                  <Icon size={18} className={selected ? "text-accent" : "text-muted"} aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-fg">{label}</span>
                    <span className="hidden sm:block text-xs text-muted">{hint}</span>
                  </span>
                  {selected && <Check size={16} className="hidden sm:block text-accent" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-3">Accent color</legend>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
            {ACCENTS.map((a) => {
              const selected = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition-colors ${
                    selected ? "border-accent ring-1 ring-accent" : "border-line-strong hover:border-accent"
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full ring-1 ring-line-strong flex items-center justify-center"
                    style={{ background: resolvedTheme === "dark" ? a.dark : a.light }}
                  >
                    {selected && <Check size={16} className="text-accent-ink" aria-hidden="true" />}
                  </span>
                  <span className="text-sm font-medium text-fg">{a.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <AiAssistantsSettings />

      <YourData />

      <HelpAndLegal />
    </div>
  );
}

function PlanSection() {
  const { plan, planExpiresAt, planSource, trial, entitlements, upgradeUrl, loaded } = usePreferences();
  if (!loaded) return null;
  const until = planExpiresAt ? new Date(planExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
  const daysLeft = planExpiresAt ? Math.max(0, Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / 86_400_000)) : null;
  const ended = !entitlements.access;
  const included = ended
    ? []
    : [
        "Money: accounts, transactions, budget templates, reports",
        "Every module: investments, habits, fitness, goals, notes, weekly review",
        entitlements.mcp ? (entitlements.apiTokens ? "AI assistants and personal access tokens" : "Connect your AI assistant") : null,
      ].filter(Boolean);

  return (
    <section aria-labelledby="plan-heading" className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Your plan</p>
          <h2 id="plan-heading" className="mt-1 text-2xl font-semibold tracking-tight text-fg">
            {ended ? (trial ? "Free trial ended" : "Plan ended") : trial ? "Free trial" : `Hive ${PLAN_NAMES[plan]}`}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {ended
              ? "Choose a plan to keep using Hive. Your data is kept, and you can export or delete it below."
              : trial
              ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left, until ${until}. Nothing is charged automatically: when it ends, you choose a plan.`
              : until
              ? `Active until ${until}.`
              : planSource === "grandfathered"
              ? "Included for early users, with no end date."
              : "No end date."}
          </p>
        </div>
        {plan !== "PRO" && (
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener"
            className="h-10 px-4 inline-flex items-center rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover"
          >
            {ended || trial ? "Choose a plan" : "See plans"}
          </a>
        )}
      </div>
      {included.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {included.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-fg-2">
              <Check size={15} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CurrencyRow() {
  const { currency, setCurrency } = usePreferences();
  const [error, setError] = useState("");
  return (
    <div className="flex items-center gap-3.5 px-5 sm:px-6 py-3.5">
      <span className="w-9 h-9 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
        <Coins size={17} className="text-accent" aria-hidden="true" />
      </span>
      <span className="flex-1 min-w-0">
        <label htmlFor="currency" className="block text-sm font-semibold text-fg">Currency</label>
        <span className="block text-xs text-muted">
          {error || "How amounts are shown. Nothing is converted."}
        </span>
      </span>
      <select
        id="currency"
        value={currency}
        onChange={(e) => {
          setError("");
          setCurrency(e.target.value).catch((err) => setError(err.message));
        }}
        className="h-10 max-w-[45%] rounded-xl border border-line-strong bg-surface px-3 text-sm text-fg"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
