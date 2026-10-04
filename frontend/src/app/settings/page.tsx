"use client";

import { Sun, Moon, Monitor, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAppearance } from "@/components/AppearanceProvider";
import { ACCENTS, ThemePref } from "@/lib/appearance";

const THEME_OPTIONS: { id: ThemePref; label: string; hint: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", hint: "Always light", icon: Sun },
  { id: "dark", label: "Dark", hint: "Always dark", icon: Moon },
  { id: "system", label: "Auto", hint: "Follows your device", icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme, accent, setAccent, resolvedTheme } = useAppearance();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />

      <section aria-labelledby="appearance-heading" className="bg-surface border border-line rounded-2xl p-6 space-y-6">
        <div>
          <h2 id="appearance-heading" className="text-[15px] font-semibold text-fg">Appearance</h2>
          <p className="text-sm text-muted mt-1">Saved on this device.</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-3">Theme</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEME_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
              const selected = theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                    selected ? "border-accent ring-1 ring-accent bg-accent-soft" : "border-line-strong hover:border-accent"
                  }`}
                >
                  <Icon size={18} className={selected ? "text-accent" : "text-muted"} aria-hidden="true" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-fg">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </span>
                  {selected && <Check size={16} className="text-accent" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-3">Accent color</legend>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

    </div>
  );
}
