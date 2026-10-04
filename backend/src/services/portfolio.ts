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

    const tradeTotal = trade.quantity * trade.pricePerUnit;
    if (trade.tradeType === "BUY") {
      existing.quantity += trade.quantity;
      existing.totalCost += tradeTotal;
    } else {
      existing.quantity -= trade.quantity;
      // Reduce cost basis proportionally
      const avgCost = existing.totalCost / Math.max(existing.quantity + trade.quantity, 1);
      existing.totalCost -= avgCost * trade.quantity;
    }
    existing.totalFees += trade.fees;
    holdingsMap.set(trade.ticker, existing);
  }

  // Filter out fully sold positions
  return Array.from(holdingsMap.values()).filter((h) => h.quantity > 0.000001);
}
