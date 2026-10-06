
interface QuoteResult {
  price: number;
  currency: string;
  name: string;
  change: number;
  changePercent: number;
  marketCap?: number;
}

interface CacheEntry {
  data: QuoteResult;
  fetchedAt: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, CacheEntry>();

export async function getQuote(ticker: string): Promise<QuoteResult> {
  const upperTicker = ticker.toUpperCase();
  const cached = cache.get(upperTicker);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const data = await fetchChartQuote(upperTicker);

  cache.set(upperTicker, { data, fetchedAt: Date.now() });
  return data;
}

/**
 * Price from Yahoo's public chart endpoint. The yahoo-finance2 v2 quote() call needs a
 * cookie/crumb handshake that Yahoo now answers with "Too Many Requests"; this endpoint doesn't.
 */
async function fetchChartQuote(ticker: string): Promise<QuoteResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (LifeHub)" } });
  if (!res.ok) throw new Error(`Yahoo returned ${res.status} for ${ticker}`);
  const body = (await res.json()) as {
    chart?: { result?: { meta?: Record<string, any> }[]; error?: { description?: string } | null };
  };
  const meta = body.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) {
    throw new Error(body.chart?.error?.description ?? `No price available for ${ticker}`);
  }
  const price: number = meta.regularMarketPrice;
  const previous: number | undefined = meta.chartPreviousClose ?? meta.previousClose;
  const change = previous ? price - previous : 0;
  return {
    price,
    currency: meta.currency ?? "USD",
    name: meta.longName ?? meta.shortName ?? ticker,
    change,
    changePercent: previous ? (change / previous) * 100 : 0,
  };
}

export async function getQuotes(tickers: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        results.set(ticker.toUpperCase(), await getQuote(ticker));
      } catch {
        // skip failed tickers silently — portfolio still renders without price
      }
    })
  );
  return results;
}

export function clearCache(tickers?: string[]) {
  if (!tickers) return cache.clear();
  tickers.forEach((t) => cache.delete(t.toUpperCase()));
}
