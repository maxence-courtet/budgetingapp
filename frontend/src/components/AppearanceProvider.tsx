"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import {
  ACCENTS,
  ACCENT_KEY,
  AccentId,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  THEME_KEY,
  THEME_PREFS,
  ThemePref,
} from "@/lib/appearance";

interface Appearance {
  theme: ThemePref;
  resolvedTheme: "light" | "dark";
  accent: AccentId;
  setTheme: (t: ThemePref) => void;
  setAccent: (a: AccentId) => void;
}

const AppearanceContext = createContext<Appearance | null>(null);

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode): the choice still applies for this visit.
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);
  const [systemDark, setSystemDark] = useState(false);
  // Until the saved choice is read, leave <html> as the inline head script set it (no flash of defaults).
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setThemeState(read(THEME_KEY, THEME_PREFS, DEFAULT_THEME));
    setAccentState(read(ACCENT_KEY, ACCENTS.map((a) => a.id), DEFAULT_ACCENT));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    setLoaded(true);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Colours switch in one frame: transitions are paused while the attributes change.
  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    if (root.dataset.theme === resolvedTheme && root.dataset.accent === accent) return;
    root.classList.add("theme-switching");
    root.dataset.theme = resolvedTheme;
    root.dataset.accent = accent;
    const done = () => root.classList.remove("theme-switching");
    const id = requestAnimationFrame(() => requestAnimationFrame(done));
    const fallback = window.setTimeout(done, 100); // background tabs may not run animation frames
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(fallback);
      done();
    };
  }, [loaded, resolvedTheme, accent]);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    write(THEME_KEY, t);
  }, []);

  const setAccent = useCallback((a: AccentId) => {
    setAccentState(a);
    write(ACCENT_KEY, a);
  }, []);

  return (
    <AppearanceContext.Provider value={{ theme, resolvedTheme, accent, setTheme, setAccent }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside AppearanceProvider");
  return ctx;
}
