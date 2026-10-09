import { DEFAULT_CURRENCY } from "@/lib/currencies";

// The currency amounts are shown in, from the user's preferences (see PreferencesProvider).
let currency = DEFAULT_CURRENCY;
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(whole: boolean) {
  const key = `${currency}:${whole}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      ...(whole ? { maximumFractionDigits: 0, minimumFractionDigits: 0 } : {}),
    });
    formatters.set(key, f);
  }
  return f;
}

export function setDisplayCurrency(code: string) {
  currency = code;
}

export function getDisplayCurrency() {
  return currency;
}

/** The currency's symbol on its own, e.g. "$", "€" or "CHF". */
export function currencySymbol(): string {
  return formatter(true).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
}

export function fmt(n: number): string {
  return formatter(false).format(Math.abs(n));
}

export function formatAmount(n: number, type?: string): string {
  const prefix = type === "INCOME" ? "+" : type === "SPENDING" ? "-" : n < 0 ? "-" : "";
  return prefix + fmt(n);
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Whole currency units, for tight summary tiles. */
export function fmtWhole(n: number): string {
  return formatter(true).format(Math.round(Math.abs(n)));
}
