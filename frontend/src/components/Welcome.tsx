"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  PiggyBank,
} from "lucide-react";
import { HiveMark } from "@/components/HiveLogo";
import { PlanChip } from "@/components/PlanGate";
import { MODULE_PLAN, PLAN_NAMES } from "@/lib/plans";
import { usePreferences } from "@/components/PreferencesProvider";
import { ALL_MODULES, ModuleId, moduleItems } from "@/lib/nav";

const STEPS = ["welcome", "choose"] as const;

const PRESETS: { id: string; label: string; hint: string; modules: ModuleId[] }[] = [
  { id: "money", label: "Just money", hint: "Accounts, transactions and reports", modules: [] },
  { id: "invest", label: "Money & investing", hint: "Adds your portfolio", modules: ["investments"] },
  { id: "all", label: "Everything", hint: "Money plus habits, fitness, goals…", modules: ALL_MODULES },
];

/**
 * First-run walkthrough: a short tour of what Hive does, ending with the user choosing which parts to show.
 * Opens once per account (the choice is stored on the backend) and again from Settings.
 */
export function Welcome() {
  const { welcomeOpen, closeWelcome, chosenModules: saved, canUse, plan, onboarded, name, save, startTour } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [modules, setModules] = useState<ModuleId[]>(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (welcomeOpen && !dialog.open) {
      setStep(0);
      setModules(saved);
      setError("");
      dialog.showModal();
    } else if (!welcomeOpen && dialog.open) {
      dialog.close();
    }
    // `saved` is only read when the walkthrough opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeOpen]);

  async function finish(choice: ModuleId[] | null, tour = false) {
    setSaving(true);
    setError("");
    try {
      await save(choice ? { modules: choice, onboarded: true } : { onboarded: true });
      closeWelcome();
      // The tour points at the real menu, so it starts once the chosen modules are showing.
      if (tour) startTour();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your choice");
    } finally {
      setSaving(false);
    }
  }

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const toggle = (id: ModuleId) =>
    setModules((m) => (m.includes(id) ? m.filter((x) => x !== id) : ALL_MODULES.filter((x) => x === id || m.includes(x))));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-title"
      // Escape skips the tour (keeps the current choice) rather than leaving it half done.
      onCancel={(e) => {
        e.preventDefault();
        if (!saving) finish(null);
      }}
      className="m-0 sm:m-auto w-full h-[100dvh] max-w-none max-h-none sm:h-auto sm:max-h-[90dvh] sm:w-[min(36rem,calc(100vw-2rem))] sm:rounded-3xl border-0 sm:border sm:border-line-strong bg-surface text-fg p-0 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      {welcomeOpen && (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-5 sm:px-7 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6">
            <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-accent" : i < step ? "w-1.5 bg-accent/60" : "w-1.5 bg-line-strong"
                  }`}
                />
              ))}
            </ol>
            {!last && (
              <button
                type="button"
                onClick={() => finish(null)}
                disabled={saving}
                className="h-9 px-3 -mr-3 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface-2"
              >
                {onboarded ? "Close" : "Skip"}
              </button>
            )}
          </div>

          <div key={current} className="flex-1 overflow-y-auto px-5 sm:px-7 py-6 animate-[welcome-in_.35s_ease-out]">
            {current === "welcome" && (
              <div className="h-full flex flex-col justify-center text-center items-center py-6">
                <div className="relative mb-8">
                  <div className="absolute inset-0 -m-6 rounded-full bg-accent-soft blur-xl" aria-hidden="true" />
                  <HiveMark size={88} className="relative" />
                </div>
                <h2 id="welcome-title" className="text-[28px] sm:text-[32px] leading-tight font-semibold tracking-tight">
                  Welcome to Hive{name && name !== "User" ? `, ${name.split(" ")[0]}` : ""}
                </h2>
                <p className="mt-3 text-[15px] text-muted max-w-sm">
                  Your money and the rest of your life, side by side. Choose what Hive shows you, then we&apos;ll
                  point out where everything is.
                </p>
              </div>
            )}

            {current === "choose" && (
              <div>
                <h2 id="welcome-title" className="text-[24px] sm:text-[26px] leading-tight font-semibold tracking-tight">
                  What should Hive show?
                </h2>
                <p className="mt-2 text-[15px] text-muted">
                  Start small if you like. You can change this any time in Settings.
                  {plan === "FREE" && ` Modules marked ${PLAN_NAMES[MODULE_PLAN]} turn on when you upgrade; your choice is kept.`}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Quick choices">
                  {PRESETS.map((p) => {
                    const selected = p.modules.length === modules.length && p.modules.every((m) => modules.includes(m));
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setModules(p.modules)}
                        aria-pressed={selected}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          selected ? "border-accent ring-1 ring-accent bg-accent-soft" : "border-line-strong hover:border-accent"
                        }`}
                      >
                        <span className="block text-sm font-semibold leading-tight">{p.label}</span>
                        <span className="hidden sm:block text-xs text-muted mt-1">{p.hint}</span>
                      </button>
                    );
                  })}
                </div>

                <ul role="list" className="mt-5 rounded-2xl border border-line divide-y divide-line overflow-hidden">
                  <li className="flex items-center gap-3 px-4 py-3 bg-canvas">
                    <PiggyBank size={18} className="text-accent shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold">Money</span>
                      <span className="block text-xs text-muted">Transactions, reports, accounts</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Lock size={12} aria-hidden="true" /> Always on
                    </span>
                  </li>
                  {moduleItems.map(({ module, label, icon: Icon, description }) => {
                    const on = modules.includes(module!);
                    return (
                      <li key={module}>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          onClick={() => toggle(module!)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
                        >
                          <Icon size={18} className={on ? "text-accent shrink-0" : "text-faint shrink-0"} aria-hidden="true" />
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2 text-sm font-semibold">
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
                {error && (
                  <p role="alert" className="mt-3 text-sm text-neg">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-5 sm:px-7 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 border-t border-line">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                aria-label="Back"
                className="h-12 w-12 shrink-0 rounded-xl border border-line-strong flex items-center justify-center text-muted hover:text-fg"
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            )}
            {last && (
              <button
                type="button"
                onClick={() => finish(modules)}
                disabled={saving}
                className="h-12 px-3 shrink-0 rounded-xl text-sm font-medium text-muted hover:text-fg"
              >
                Skip tour
              </button>
            )}
            <button
              type="button"
              autoFocus
              disabled={saving}
              onClick={() => (last ? finish(modules, true) : setStep((s) => s + 1))}
              className="flex-1 h-12 rounded-xl bg-accent text-accent-ink text-[15px] font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {last ? (
                <>
                  {saving ? "Saving…" : "Show me around"} <ArrowRight size={18} aria-hidden="true" />
                </>
              ) : (
                <>
                  {step === 0 ? "Get started" : "Next"} <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

export function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${on ? "bg-accent" : "bg-line-strong"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`}
      />
    </span>
  );
}
