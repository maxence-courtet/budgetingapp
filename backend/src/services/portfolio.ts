import { InvestmentTrade } from "@prisma/client";
import prisma from "./prisma";
import { endOfTodayUtc } from "./validate";
import { getQuotes } from "./marketPrice";
import { fxRates, majorUnit } from "./fx";

type CashTrade = Pick<InvestmentTrade, "tradeType" | "quantity" | "pricePerUnit" | "fees" | "fxRate">;

/**
 * What a trade does to the cash of its account: a buy spends price × quantity plus fees,
 * a sell brings in price × quantity minus fees. So moving money to a broker and buying with it
 * leaves net worth unchanged, and fees lower it.
 */
export function tradeCash(t: CashTrade): number {
  const gross = t.quantity * t.pricePerUnit;
  // In the user's currency, at the trade date's exchange rate.
  return (t.tradeType === "BUY" ? -(gross + t.fees) : gross - t.fees) * (t.fxRate ?? 1);
}

/** Cash effect of each account's trades up to today, by account id. */
export async function tradeCashByAccount(userId: string, accountId?: string): Promise<Map<string, number>> {
  const trades = await prisma.investmentTrade.findMany({
    where: { userId, date: { lte: endOfTodayUtc() }, ...(accountId ? { accountId } : {}) },
    select: { accountId: true, tradeType: true, quantity: true, pricePerUnit: true, fees: true, fxRate: true },
  });
  const out = new Map<string, number>();
  for (const t of trades) out.set(t.accountId, (out.get(t.accountId) ?? 0) + tradeCash(t));
  return out;
}

export interface Holding {
  ticker: string;
  assetType: string;
  quantity: number;
  /** Cost basis in the user's currency (each trade at its own exchange rate). */
  totalCost: number;
  totalFees: number;
  /** Currency the trades were made in (the latest trade's), null for the user's own. */
  currency: string | null;
}

/** Aggregate trades (oldest first) into open positions with their cost basis. */
export function aggregateHoldings(trades: InvestmentTrade[]): Holding[] {
  const holdingsMap = new Map<string, Holding>();

  for (const trade of trades) {
    const existing = holdingsMap.get(trade.ticker) ?? {
      ticker: trade.ticker,
      assetType: trade.assetType,
      quantity: 0,
      totalCost: 0,
      totalFees: 0,
      currency: null,
    };
    const rate = trade.fxRate ?? 1;
    existing.currency = trade.currency ?? existing.currency;

    if (trade.tradeType === "BUY") {
      // Buy fees are part of what the position cost.
      existing.quantity += trade.quantity;
      existing.totalCost += (trade.quantity * trade.pricePerUnit + trade.fees) * rate;
    } else {
      // Remove the sold share of the cost basis at the average cost before the sale.
      const before = existing.quantity;
      const avgCost = before > 0 ? existing.totalCost / before : 0;
      const sold = Math.min(trade.quantity, Math.max(before, 0));
      existing.quantity -= trade.quantity;
      existing.totalCost = Math.max(existing.totalCost - avgCost * sold, 0);
    }
    existing.totalFees += trade.fees * rate;
    holdingsMap.set(trade.ticker, existing);
  }

  // Filter out fully sold positions
  return Array.from(holdingsMap.values()).filter((h) => h.quantity > 0.000001);
}

/** Quantity held of each ticker after replaying trades in date order; the first ticker that ever goes negative, if any. */
export function findOversell(trades: Pick<InvestmentTrade, "ticker" | "tradeType" | "quantity" | "date">[]): string | null {
  const held = new Map<string, number>();
  const sorted = [...trades].sort((a, b) => a.date.getTime() - b.date.getTime() || (a.tradeType === "BUY" ? -1 : 1));
  for (const t of sorted) {
    const q = (held.get(t.ticker) ?? 0) + (t.tradeType === "BUY" ? t.quantity : -t.quantity);
    if (q < -1e-9) return t.ticker;
    held.set(t.ticker, q);
  }
  return null;
}

export interface PricedHolding {
  /** Live price in the asset's own currency (major unit), or null. */
  price: number | null;
  currency: string | null;
  /** Today's value of 1 unit of that currency in the user's currency. */
  fx: number | null;
  /** Value in the user's currency; the cost basis when there is no price or no exchange rate. */
  value: number;
  priced: boolean;
  name: string | null;
  /** Today's change, in the user's currency. */
  dayChange: number | null;
  dayChangePercent: number | null;
}

/** Live value of each holding in the user's currency (`base`), by ticker. */
export async function priceHoldings(holdings: Holding[], base: string): Promise<Map<string, PricedHolding>> {
  const quotes = await getQuotes(holdings.map((h) => h.ticker));
  const currencies = [...quotes.values()].map((q) => majorUnit(q.currency).currency);
  const rates = await fxRates(currencies.filter((c) => c !== base), base);
  rates.set(base, 1);
  const out = new Map<string, PricedHolding>();
  for (const h of holdings) {
    const q = quotes.get(h.ticker);
    if (!q?.price) {
      out.set(h.ticker, { price: null, currency: h.currency, fx: null, value: h.totalCost, priced: false, name: null, dayChange: null, dayChangePercent: null });
      continue;
    }
    const { currency, factor } = majorUnit(q.currency);
    const price = q.price * factor;
    const fx = rates.get(currency) ?? null;
    out.set(h.ticker, {
      price,
      currency,
      fx,
      value: fx != null ? h.quantity * price * fx : h.totalCost,
      priced: fx != null,
      name: q.name,
      dayChange: fx != null ? q.change * factor * h.quantity * fx : null,
      dayChangePercent: fx != null ? q.changePercent : null,
    });
  }
  return out;
}
