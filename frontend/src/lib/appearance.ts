export const THEME_PREFS = ["light", "dark", "system"] as const;
export type ThemePref = (typeof THEME_PREFS)[number];

export const ACCENTS = [
  { id: "honey", label: "Honey", light: "#F5B31F", dark: "#F5B31F" },
  { id: "lime", label: "Lime", light: "#4d7c0f", dark: "#c6f432" },
  { id: "ion", label: "Ion blue", light: "#3d5bf5", dark: "#6e8bff" },
  { id: "ember", label: "Ember", light: "#c2410c", dark: "#ff6a2b" },
  { id: "violet", label: "Violet", light: "#6d4ae8", dark: "#a78bfa" },
  { id: "mono", label: "Mono", light: "#111113", dark: "#f2f2f2" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export const DEFAULT_THEME: ThemePref = "system";
export const DEFAULT_ACCENT: AccentId = "honey";
export const THEME_KEY = "lh-theme";
export const ACCENT_KEY = "lh-accent";

// Runs inline in <head> before first paint so the saved theme never flashes.
export const appearanceInitScript = `(function(){try{var e=document.documentElement;var t=localStorage.getItem("${THEME_KEY}")||"${DEFAULT_THEME}";var a=localStorage.getItem("${ACCENT_KEY}")||"${DEFAULT_ACCENT}";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);e.dataset.theme=d?"dark":"light";e.dataset.accent=a;}catch(_){}})();`;
