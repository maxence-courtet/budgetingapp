import { InvestmentTrade } from "@prisma/client";

export interface Holding {
  ticker: string;
  assetType: string;
  quantity: number;
  totalCost: number;
  totalFees: number;
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
    };

    if (trade.tradeType === "BUY") {
      // Buy fees are part of what the position cost.
      existing.quantity += trade.quantity;
      existing.totalCost += trade.quantity * trade.pricePerUnit + trade.fees;
    } else {
      // Remove the sold share of the cost basis at the average cost before the sale.
      const before = existing.quantity;
      const avgCost = before > 0 ? existing.totalCost / before : 0;
      const sold = Math.min(trade.quantity, Math.max(before, 0));
      existing.quantity -= trade.quantity;
      existing.totalCost = Math.max(existing.totalCost - avgCost * sold, 0);
    }
    existing.totalFees += trade.fees;
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
