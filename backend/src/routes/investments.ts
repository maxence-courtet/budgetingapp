import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { getQuote, getQuotes } from "../services/marketPrice";

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
              ...(dateFrom ? { gte: new Date(String(dateFrom)) } : {}),
              ...(dateTo ? { lte: new Date(String(dateTo)) } : {}),
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
  const { accountId, ticker, assetType, tradeType, quantity, pricePerUnit, fees, date, notes } = req.body;

  if (!accountId || !ticker || !assetType || !tradeType || !quantity || !pricePerUnit || !date) {
    return res.status(400).json({ error: "accountId, ticker, assetType, tradeType, quantity, pricePerUnit, date are required" });
  }

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) return res.status(404).json({ error: "Account not found" });

  const trade = await prisma.investmentTrade.create({
    data: {
      userId,
      accountId,
      ticker: String(ticker).toUpperCase(),
      assetType,
      tradeType,
      quantity: Number(quantity),
      pricePerUnit: Number(pricePerUnit),
      fees: Number(fees ?? 0),
      date: new Date(date),
      notes: notes ?? null,
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

  const { ticker, assetType, tradeType, quantity, pricePerUnit, fees, date, notes } = req.body;

  const updated = await prisma.investmentTrade.update({
    where: { id },
    data: {
      ...(ticker ? { ticker: String(ticker).toUpperCase() } : {}),
      ...(assetType ? { assetType } : {}),
      ...(tradeType ? { tradeType } : {}),
      ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      ...(pricePerUnit !== undefined ? { pricePerUnit: Number(pricePerUnit) } : {}),
      ...(fees !== undefined ? { fees: Number(fees) } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(notes !== undefined ? { notes } : {}),
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

  // Aggregate by ticker
  const holdingsMap = new Map<string, {
    ticker: string;
    assetType: string;
    quantity: number;
    totalCost: number;
    totalFees: number;
  }>();

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
  const holdings = Array.from(holdingsMap.values()).filter((h) => h.quantity > 0.000001);

  // Fetch current prices
  const tickers = holdings.map((h) => h.ticker);
  const prices = await getQuotes(tickers);

  const portfolio = holdings.map((h) => {
    const quote = prices.get(h.ticker);
    const avgCostBasis = h.quantity > 0 ? h.totalCost / h.quantity : 0;
    const currentPrice = quote?.price ?? 0;
    const currentValue = h.quantity * currentPrice;
    const costBasisTotal = h.quantity * avgCostBasis;
    const gainLoss = currentValue - costBasisTotal;
    const gainLossPct = costBasisTotal > 0 ? (gainLoss / costBasisTotal) * 100 : 0;

    return {
      ticker: h.ticker,
      assetType: h.assetType,
      name: quote?.name ?? h.ticker,
      quantity: h.quantity,
      avgCostBasis,
      currentPrice,
      currentValue,
      gainLoss,
      gainLossPct,
      currency: quote?.currency ?? "USD",
      dayChange: quote?.change ?? 0,
      dayChangePercent: quote?.changePercent ?? 0,
    };
  });

  const totalValue = portfolio.reduce((s, h) => s + h.currentValue, 0);
  const totalGainLoss = portfolio.reduce((s, h) => s + h.gainLoss, 0);
  const totalCostBasis = portfolio.reduce((s, h) => s + h.avgCostBasis * h.quantity, 0);

  res.json({
    holdings: portfolio,
    summary: {
      totalValue,
      totalGainLoss,
      totalGainLossPct: totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0,
      holdingsCount: portfolio.length,
      lastUpdated: new Date().toISOString(),
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
