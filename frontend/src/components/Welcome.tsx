"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  BarChart2,
  Check,
  Lock,
  PiggyBank,
  Plus,
  Sparkles,
  Plug,
  CalendarCheck,
  LucideIcon,
} from "lucide-react";
import { HiveMark } from "@/components/HiveLogo";
import { usePreferences } from "@/components/PreferencesProvider";
import { ALL_MODULES, ModuleId, lifeItems, moduleItems } from "@/lib/nav";

const STEPS = ["welcome", "money", "life", "ai", "choose"] as const;

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
  const { welcomeOpen, closeWelcome, modules: saved, onboarded, name, save } = usePreferences();
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

  async function finish(choice: ModuleId[] | null) {
    setSaving(true);
    setError("");
    try {
      await save(choice ? { modules: choice, onboarded: true } : { onboarded: true });
      closeWelcome();
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
                  Your money and the rest of your life, side by side. Here&apos;s a quick tour, then you choose what
                  Hive shows you.
                </p>
              </div>
            )}

            {current === "money" && (
              <Slide
                icon={PiggyBank}
                eyebrow="Money"
                title="Know where your money goes"
                lead="Two places cover the everyday: your transactions, month by month, and reports over time."
              >
                <Feature icon={Plus} title="Add from anywhere" text="The + button files a transaction into the right month, and creates the month if needed." />
                <Feature icon={ArrowLeftRight} title="Transactions" text="Each month's spending against its budget, with search across everything." />
                <Feature icon={BarChart2} title="Reports" text="Where money goes by category, and how your net worth moves." />
                <p className="text-sm text-muted pt-1">
                  Accounts, categories and budget templates are set up once. They live in Settings, out of the way.
                </p>
              </Slide>
            )}

            {current === "life" && (
              <Slide
                icon={CalendarCheck}
                eyebrow="Life"
                title="The rest of the honeycomb"
                lead="Optional modules for the habits and goals that money touches."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {lifeItems.map(({ href, label, icon: Icon, description }) => (
                    <div key={href} className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-canvas">
                      <Icon size={18} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted mt-0.5">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Slide>
            )}

            {current === "ai" && (
              <Slide
                icon={Sparkles}
                eyebrow="AI"
                title="An assistant that knows your numbers"
                lead="Only when you ask, and only with your own data."
              >
                <Feature icon={Sparkles} title="Next moves" text="On Home, AI ranks the three things most worth doing now." />
                <Feature icon={CalendarCheck} title="Weekly review" text="A short recap of your week across money and habits." />
                <Feature
                  icon={Plug}
                  title="Bring your own assistant"
                  text="Connect Claude, ChatGPT or any MCP assistant from Settings → AI assistants, so it can read and add to your Hive."
                />
              </Slide>
            )}

            {current === "choose" && (
              <div>
                <h2 id="welcome-title" className="text-[24px] sm:text-[26px] leading-tight font-semibold tracking-tight">
                  What should Hive show?
                </h2>
                <p className="mt-2 text-[15px] text-muted">Start small if you like. You can change this any time in Settings.</p>

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
                            <span className="block text-sm font-semibold">{label}</span>
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
            <button
              type="button"
              autoFocus
              disabled={saving}
              onClick={() => (last ? finish(modules) : setStep((s) => s + 1))}
              className="flex-1 h-12 rounded-xl bg-accent text-accent-ink text-[15px] font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {last ? (
                <>
                  <Check size={18} aria-hidden="true" /> {saving ? "Saving…" : "Start using Hive"}
                </>
              ) : (
                <>
                  {step === 0 ? "Show me around" : "Next"} <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}

function Slide({
  icon: Icon,
  eyebrow,
  title,
  lead,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center mb-5">
        <Icon size={26} className="text-accent" aria-hidden="true" />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{eyebrow}</p>
      <h2 id="welcome-title" className="mt-1.5 text-[24px] sm:text-[26px] leading-tight font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-[15px] text-muted">{lead}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="w-9 h-9 shrink-0 rounded-xl border border-line bg-canvas flex items-center justify-center">
        <Icon size={17} className="text-fg" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted mt-0.5">{text}</p>
      </div>
    </div>
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
