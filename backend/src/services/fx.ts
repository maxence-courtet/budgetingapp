/**
 * Exchange rates from Yahoo's public chart endpoint (pairs like "EURCHF=X"), cached like quotes.
 * Rates are only used to value investments held in another currency than the user's own.
 */
const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { rate: number; at: number }>();

/** Yahoo quotes some exchanges in minor units (pence, cents); returns the currency and the factor to its major unit. */
export function majorUnit(code: string): { currency: string; factor: number } {
  if (code === "GBp" || code === "GBX") return { currency: "GBP", factor: 0.01 };
  if (code === "ZAc" || code === "ZAC") return { currency: "ZAR", factor: 0.01 };
  if (code === "ILA") return { currency: "ILS", factor: 0.01 };
  return { currency: code.toUpperCase(), factor: 1 };
}

async function chart(pair: string, query: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?${query}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (LifeHub)" } });
  if (!res.ok) throw new Error(`Yahoo returned ${res.status} for ${pair}`);
  return (await res.json()) as any;
}

/** Value of 1 `from` in `to`, today, or on `date` (the last close on or before it). */
export async function fxRate(from: string, to: string, date?: Date): Promise<number> {
  from = from.toUpperCase();
  to = to.toUpperCase();
  if (from === to) return 1;
  const day = date ? date.toISOString().slice(0, 10) : "now";
  const key = `${from}${to}:${day}`;
  const hit = cache.get(key);
  if (hit && (day !== "now" || Date.now() - hit.at < TTL_MS)) return hit.rate;

  const pair = `${from}${to}=X`;
  let rate: number | undefined;
  if (!date) {
    rate = (await chart(pair, "range=1d&interval=1d")).chart?.result?.[0]?.meta?.regularMarketPrice;
  } else {
    // A week back covers weekends and holidays.
    const end = Math.floor(date.getTime() / 1000) + 86_400;
    const body = await chart(pair, `period1=${end - 8 * 86_400}&period2=${end}&interval=1d`);
    const closes: (number | null)[] = body.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    rate = [...closes].reverse().find((c): c is number => typeof c === "number" && c > 0);
  }
  if (!rate || !(rate > 0)) throw new Error(`No exchange rate for ${from} to ${to}`);
  cache.set(key, { rate, at: Date.now() });
  return rate;
}

/** Today's rates for several currencies into `to`; currencies without a rate are left out. */
export async function fxRates(from: string[], to: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  await Promise.all(
    [...new Set(from)].map(async (c) => {
      try {
        out.set(c, await fxRate(c, to));
      } catch {
        // Valued at cost instead.
      }
    })
  );
  return out;
}
