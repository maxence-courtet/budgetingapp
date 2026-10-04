"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { navItems, navSections, isTypingTarget } from "@/lib/nav";
import { ACCENTS, ThemePref } from "@/lib/appearance";
import { useAppearance } from "@/components/AppearanceProvider";

const THEME_OPTIONS: { id: ThemePref; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Auto", icon: Monitor },
];

function useGoShortcuts() {
  const router = useRouter();
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toUpperCase();
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const item = navItems.find((i) => i.key === key);
        if (item) {
          e.preventDefault();
          router.push(item.href);
        }
        return;
      }
      if (key === "G") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { theme, setTheme, accent, setAccent, resolvedTheme } = useAppearance();
  useGoShortcuts();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const accentLabel = ACCENTS.find((a) => a.id === accent)?.label;

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-side border-r border-line flex flex-col z-40">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="w-7 h-7 rounded-lg bg-accent text-accent-ink flex items-center justify-center shrink-0">
          <span className="text-sm font-bold">L</span>
        </div>
        <span className="font-semibold tracking-tight text-fg">Life Hub</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
              {section.label}
            </p>
            <ul role="list" className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, key }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      aria-keyshortcuts={`G ${key}`}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-surface-2 text-fg"
                          : "text-muted hover:text-fg hover:bg-surface-2"
                      }`}
                    >
                      <Icon
                        size={16}
                        aria-hidden="true"
                        className={active ? "text-accent" : "text-faint group-hover:text-fg"}
                      />
                      <span className="flex-1">{label}</span>
                      <span className="font-mono text-[11px] text-faint" aria-hidden="true">
                        G {key}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <section aria-labelledby="appearance-heading" className="mx-3 pt-4 pb-3 border-t border-line space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 id="appearance-heading" className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
            Appearance
          </h2>
          <span className="text-xs font-medium text-fg">{accentLabel}</span>
        </div>
        <div role="group" aria-label="Theme" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-2">
          {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id)}
              aria-pressed={theme === id}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-colors ${
                theme === id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Accent color" className="grid grid-cols-5">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccent(a.id)}
              aria-pressed={accent === a.id}
              aria-label={`${a.label} accent`}
              title={a.label}
              className="h-11 flex items-center justify-center"
            >
              <span
                className={`block w-6 h-6 rounded-full transition-shadow ${
                  accent === a.id
                    ? "ring-2 ring-fg ring-offset-2 ring-offset-side"
                    : "ring-1 ring-line-strong"
                }`}
                style={{ background: resolvedTheme === "dark" ? a.dark : a.light }}
              />
            </button>
          ))}
        </div>
      </section>

      <div className="border-t border-line px-3 py-3">
        {user?.email && <p className="px-3 mb-1 text-xs text-muted truncate">{user.email}</p>}
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface-2 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </a>
      </div>
    </aside>
  );
}
