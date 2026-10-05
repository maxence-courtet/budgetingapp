import prisma from "./prisma";
import { aggregateHoldings } from "./portfolio";
import { getQuotes } from "./marketPrice";
import { endOfTodayUtc } from "./validate";

export interface NetWorthPoint {
  month: string; // YYYY-MM
  cash: number;
  investments: number;
  total: number;
  /** live = priced now, snapshot = priced when that month was recorded, cost = cost basis (no price history). */
  investmentsSource: "live" | "snapshot" | "cost";
}

const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 1) - 1);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);

/**
 * Month-end net worth for the last `months` months (current month last).
 * Cash is rebuilt from PAID transactions, the same way account balances are.
 * The current month's live figures are stored as a snapshot on each call.
 */
export async function netWorthHistory(userId: string, months: number): Promise<NetWorthPoint[]> {
  const now = new Date();
  const ends: { key: string; start: Date; end: Date }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - i;
    ends.push({ key: monthKey(monthStart(y, m)), start: monthStart(y, m), end: monthEnd(y, m) });
  }

  const [txns, trades, snapshots] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "PAID" },
      select: { amount: true, date: true, fromAccountId: true, toAccountId: true },
    }),
    prisma.investmentTrade.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.netWorthSnapshot.findMany({ where: { userId, month: { gte: ends[0].start } } }),
  ]);

  // Money into an account counts +, out of an account −; transfers between own accounts cancel out.
  const signed = (t: (typeof txns)[number]) => (t.toAccountId ? t.amount : 0) - (t.fromAccountId ? t.amount : 0);
  const cashAt = (end: Date) => txns.filter((t) => t.date <= end).reduce((s, t) => s + signed(t), 0);
  const currentCash = cashAt(endOfTodayUtc()); // matches account balances: future-dated transactions don't count yet
  const costAt = (end: Date) =>
    aggregateHoldings(trades.filter((t) => t.date <= end)).reduce((s, h) => s + h.totalCost, 0);

  // Live portfolio value for the current month; fall back to cost if prices are unavailable.
  const holdings = aggregateHoldings(trades);
  let liveInvestments = holdings.reduce((s, h) => s + h.totalCost, 0);
  let liveSource: NetWorthPoint["investmentsSource"] = holdings.length ? "cost" : "live";
  if (holdings.length) {
    try {
      const quotes = await getQuotes(holdings.map((h) => h.ticker));
      if (holdings.every((h) => quotes.get(h.ticker)?.price)) {
        liveInvestments = holdings.reduce((s, h) => s + h.quantity * quotes.get(h.ticker)!.price, 0);
        liveSource = "live";
      }
    } catch {
      // Keep the cost-basis fallback.
    }
  }

  const current = ends[ends.length - 1];
  await prisma.netWorthSnapshot.upsert({
    where: { userId_month: { userId, month: current.start } },
    create: { userId, month: current.start, cash: currentCash, investments: liveInvestments, total: currentCash + liveInvestments },
    update: { cash: currentCash, investments: liveInvestments, total: currentCash + liveInvestments },
  });

  const snapshotByMonth = new Map(snapshots.map((s) => [monthKey(s.month), s]));
  return ends.map(({ key, end }, i) => {
    const isCurrent = i === ends.length - 1;
    const cash = isCurrent ? currentCash : cashAt(end);
    const snap = snapshotByMonth.get(key);
    const investments = isCurrent ? liveInvestments : snap ? snap.investments : costAt(end);
    const investmentsSource = isCurrent ? liveSource : snap ? "snapshot" : "cost";
    return { month: key, cash, investments, total: cash + investments, investmentsSource };
  });
}
