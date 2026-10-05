import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { aggregateHoldings, findOversell } from "../services/portfolio";
import { getQuote, getQuotes, clearCache } from "../services/marketPrice";
import { BadRequest, date as parseDate, num, oneOf, text, endOfTodayUtc } from "../services/validate";

const ASSET_TYPES = ["STOCK", "ETF", "CRYPTO", "OTHER"] as const;
const TRADE_TYPES = ["BUY", "SELL"] as const;

/** Validate a trade's fields (all present after merging an update). */
function checkTrade(t: Record<string, unknown>) {
  const d = parseDate(t.date, "date")!;
  if (d > endOfTodayUtc()) throw new BadRequest("A trade can't be dated in the future");
  return {
    ticker: text(t.ticker, "ticker", { max: 20 })!.toUpperCase(),
    assetType: oneOf(t.assetType, "assetType", ASSET_TYPES)!,
    tradeType: oneOf(t.tradeType, "tradeType", TRADE_TYPES)!,
    quantity: num(t.quantity, "quantity", { positive: true })!,
    pricePerUnit: num(t.pricePerUnit, "pricePerUnit", { positive: true })!,
    fees: num(t.fees, "fees", { optional: true, min: 0 }) ?? 0,
    date: d,
  };
}

/** Reject a trade set that sells more of a ticker than was held at that point. */
async function assertNoOversell(userId: string, candidate: ReturnType<typeof checkTrade>, replacingId?: string) {
  const others = await prisma.investmentTrade.findMany({
    where: { userId, ticker: candidate.ticker, ...(replacingId ? { id: { not: replacingId } } : {}) },
  });
  if (findOversell([...others, candidate])) {
    throw new BadRequest(`This would sell more ${candidate.ticker} than you held on that date`);
  }
}

const router = Router();
router.use(authMiddleware);

// List all trades
router.get("/trades", async (req, res) => {
  const userId = req.userId!;
  const { accountId, ticker, dateFrom, dateTo } = req.query;

  const trades = await prisma.investmentTrade.findMany({
    where: {
      userId,
      ...(accountId ? { accountId: String(accountId) } : {}),
      ...(ticker ? { ticker: { equals: String(ticker).toUpperCase() } } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: parseDate(dateFrom, "dateFrom")! } : {}),
              ...(dateTo ? { lte: parseDate(dateTo, "dateTo")! } : {}),
            },
          }
        : {}),
    },
    include: { account: true },
    orderBy: { date: "desc" },
  });

  res.json(trades);
});

// Create trade
router.post("/trades", async (req, res) => {
  const userId = req.userId!;
  const { accountId, notes } = req.body;
  if (!accountId) return res.status(400).json({ error: "Pick the account this trade belongs to" });
  const fields = checkTrade(req.body);

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) return res.status(404).json({ error: "Account not found" });
  await assertNoOversell(userId, fields);

  const trade = await prisma.investmentTrade.create({
    data: {
      userId,
      accountId,
      ...fields,
      notes: text(notes, "notes", { optional: true }),
    },
    include: { account: true },
  });

  res.status(201).json(trade);
});

// Update trade
router.put("/trades/:id", async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const trade = await prisma.investmentTrade.findFirst({ where: { id, userId } });
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  const body = req.body;
  const fields = checkTrade({
    ticker: body.ticker ?? trade.ticker,
    assetType: body.assetType ?? trade.assetType,
    tradeType: body.tradeType ?? trade.tradeType,
    quantity: body.quantity ?? trade.quantity,
    pricePerUnit: body.pricePerUnit ?? trade.pricePerUnit,
    fees: body.fees ?? trade.fees,
    date: body.date ?? trade.date.toISOString(),
  });
  await assertNoOversell(userId, fields, id);
  // An earlier buy can't be reduced below what later sells need either: re-check the old ticker too.
  if (fields.ticker !== trade.ticker) {
    const rest = await prisma.investmentTrade.findMany({ where: { userId, ticker: trade.ticker, id: { not: id } } });
    if (findOversell(rest)) throw new BadRequest(`Later ${trade.ticker} sells would exceed what you hold`);
  }

  let accountId = trade.accountId;
  if (body.accountId !== undefined && body.accountId !== trade.accountId) {
    const account = await prisma.account.findFirst({ where: { id: body.accountId, userId } });
    if (!account) return res.status(404).json({ error: "Account not found" });
    accountId = account.id;
  }

  const updated = await prisma.investmentTrade.update({
    where: { id },
    data: {
      ...fields,
      accountId,
      // null or "" clears the note
      ...(body.notes !== undefined ? { notes: text(body.notes, "notes", { optional: true }) } : {}),
    },
    include: { account: true },
  });

  res.json(updated);
});

// Delete trade
router.delete("/trades/:id", async (req, res) => {
  const userId = req.userId!;
  const { id } = req.params;

  const trade = await prisma.investmentTrade.findFirst({ where: { id, userId } });
  if (!trade) return res.status(404).json({ error: "Trade not found" });

  if (trade.tradeType === "BUY") {
    const rest = await prisma.investmentTrade.findMany({ where: { userId, ticker: trade.ticker, id: { not: id } } });
    if (findOversell(rest)) {
      return res.status(409).json({ error: `Delete the later ${trade.ticker} sells first: they depend on this buy` });
    }
  }
  await prisma.investmentTrade.delete({ where: { id } });
  res.status(204).send();
});

// Portfolio — aggregate trades into holdings with live prices
router.get("/portfolio", async (req, res) => {
  const userId = req.userId!;

  const trades = await prisma.investmentTrade.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const holdings = aggregateHoldings(trades);

  // Fetch current prices (?refresh=1 skips the 15-minute cache)
  const tickers = holdings.map((h) => h.ticker);
  if (req.query.refresh) clearCache(tickers);
  const prices = await getQuotes(tickers);

  const portfolio = holdings.map((h) => {
    const quote = prices.get(h.ticker);
    const avgCostBasis = h.quantity > 0 ? h.totalCost / h.quantity : 0;
    const costBasisTotal = h.totalCost;
    // No price: value the position at cost rather than at $0.
    const priceAvailable = !!quote?.price;
    const currentPrice = priceAvailable ? quote!.price : null;
    const currentValue = priceAvailable ? h.quantity * quote!.price : costBasisTotal;
    const gainLoss = priceAvailable ? currentValue - costBasisTotal : null;
    const gainLossPct = gainLoss !== null && costBasisTotal > 0 ? (gainLoss / costBasisTotal) * 100 : null;

    return {
      ticker: h.ticker,
      assetType: h.assetType,
      name: quote?.name ?? h.ticker,
      quantity: h.quantity,
      avgCostBasis,
      costBasisTotal,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
      priceAvailable,
      currency: quote?.currency ?? null,
      dayChange: priceAvailable ? quote!.change * h.quantity : null,
      dayChangePercent: priceAvailable ? quote!.changePercent : null,
    };
  });

  const priced = portfolio.filter((h) => h.priceAvailable);
  const totalValue = portfolio.reduce((s, h) => s + h.currentValue, 0);
  const totalGainLoss = priced.reduce((s, h) => s + (h.gainLoss ?? 0), 0);
  const pricedCost = priced.reduce((s, h) => s + h.costBasisTotal, 0);
  const currencies = [...new Set(priced.map((h) => h.currency).filter(Boolean))];

  res.json({
    holdings: portfolio,
    summary: {
      totalValue,
      totalCostBasis: portfolio.reduce((s, h) => s + h.costBasisTotal, 0),
      totalGainLoss,
      totalGainLossPct: pricedCost > 0 ? (totalGainLoss / pricedCost) * 100 : 0,
      holdingsCount: portfolio.length,
      unpricedCount: portfolio.length - priced.length,
      currencies,
      lastUpdated: priced.length ? new Date().toISOString() : null,
    },
  });
});

// Single ticker price
router.get("/market-price/:ticker", async (req, res) => {
  try {
    const quote = await getQuote(req.params.ticker);
    res.json(quote);
  } catch (e: any) {
    res.status(400).json({ error: `Could not fetch price for ${req.params.ticker}: ${e.message}` });
  }
});

export default router;
