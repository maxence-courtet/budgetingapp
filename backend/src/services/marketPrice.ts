import yahooFinance from "yahoo-finance2";

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

  const quote = await yahooFinance.quote(upperTicker);

  const data: QuoteResult = {
    price: quote.regularMarketPrice ?? 0,
    currency: quote.currency ?? "USD",
    name: quote.longName ?? quote.shortName ?? upperTicker,
    change: quote.regularMarketChange ?? 0,
    changePercent: quote.regularMarketChangePercent ?? 0,
    marketCap: quote.marketCap,
  };

  cache.set(upperTicker, { data, fetchedAt: Date.now() });
  return data;
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

export function clearCache() {
  cache.clear();
}
