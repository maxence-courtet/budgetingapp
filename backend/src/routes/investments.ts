import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { aggregateHoldings, findOversell, priceHoldings, tradeCashByAccount } from "../services/portfolio";
import { fxRate } from "../services/fx";
import { getQuote, clearCache } from "../services/marketPrice";
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

const CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * The trade's currency and its exchange rate into the user's currency on the trade date.
 * In the user's own currency both are stored as null (rate 1). Without a rate given, it is looked up.
 */
async function tradeCurrency(userId: string, body: Record<string, unknown>, date: Date, current?: { currency: string | null; fxRate: number | null }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currency: true } });
  const raw = body.currency !== undefined ? body.currency : current?.currency ?? null;
  const currency = raw == null || raw === "" ? user.currency : String(raw).toUpperCase();
  if (!CURRENCY_CODE.test(currency)) throw new BadRequest("currency must be a 3-letter code like USD, EUR or CHF");
  if (currency === user.currency) return { currency: null, fxRate: null };

  const given = body.fxRate ?? (body.currency === undefined && body.date === undefined ? current?.fxRate : undefined);
  if (given != null && given !== "") return { currency, fxRate: num(given, "fxRate", { positive: true })! };
  try {
    return { currency, fxRate: await fxRate(currency, user.currency, date) };
  } catch {
    throw new BadRequest(`Couldn't find the ${currency} to ${user.currency} rate for that date; enter it yourself (fxRate)`);
  }
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

const NOT_INVESTMENT = "Trades go in an investment account. Set the account's type to Investment first (Settings → Accounts).";
export const FEES_CATEGORY = "Investment fees";

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
  if (account.type !== "investment") return res.status(400).json({ error: NOT_INVESTMENT });
  await assertNoOversell(userId, fields);
  const money = await tradeCurrency(userId, req.body, fields.date);

  const trade = await prisma.investmentTrade.create({
    data: {
      userId,
      accountId,
      ...fields,
      ...money,
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
    if (account.type !== "investment") return res.status(400).json({ error: NOT_INVESTMENT });
    accountId = account.id;
  }

  const money = await tradeCurrency(userId, body, fields.date, trade);

  const updated = await prisma.investmentTrade.update({
    where: { id },
    data: {
      ...fields,
      ...money,
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

/**
 * Record a fee charged by the investment account itself (custody, management, account fees):
 * a paid spending from that account under the "Investment fees" category, in the month of its date.
 * Fees of a single trade belong on the trade instead.
 */
router.post("/fees", async (req, res) => {
  const userId = req.userId!;
  try {
    const { accountId } = req.body ?? {};
    const account = accountId ? await prisma.account.findFirst({ where: { id: String(accountId), userId } }) : null;
    if (!account) return res.status(404).json({ error: "Account not found" });
    if (account.type !== "investment") return res.status(400).json({ error: NOT_INVESTMENT });
    const amount = num(req.body.amount, "amount", { positive: true })!;
    const date = parseDate(req.body.date ?? new Date().toISOString().slice(0, 10), "date")!;
    const description = text(req.body.description, "description", { optional: true, max: 200 }) ?? "Account fee";

    const transaction = await prisma.$transaction(async (tx) => {
      const category =
        (await tx.category.findFirst({ where: { userId, name: { equals: FEES_CATEGORY, mode: "insensitive" } } })) ??
        (await tx.category.create({ data: { userId, name: FEES_CATEGORY } }));
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const m =
        (await tx.month.findFirst({ where: { userId, year, month } })) ?? (await tx.month.create({ data: { userId, year, month } }));
      return tx.transaction.create({
        data: {
          userId,
          type: "SPENDING",
          status: "PAID",
          amount,
          date,
          description,
          fromAccountId: account.id,
          categoryId: category.id,
          monthId: m.id,
        },
      });
    });
    res.status(201).json(transaction);
  } catch (e) {
    if (e instanceof BadRequest) return res.status(400).json({ error: e.message });
    throw e;
  }
});

// Portfolio — aggregate trades into holdings with live prices
router.get("/portfolio", async (req, res) => {
  const userId = req.userId!;

  const trades = await prisma.investmentTrade.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const holdings = aggregateHoldings(trades);

  // Live prices in each asset's currency, converted to the user's (?refresh=1 skips the price cache).
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { currency: true } });
  if (req.query.refresh) clearCache(holdings.map((h) => h.ticker));
  const prices = await priceHoldings(holdings, user.currency);

  const portfolio = holdings.map((h) => {
    const p = prices.get(h.ticker)!;
    const avgCostBasis = h.quantity > 0 ? h.totalCost / h.quantity : 0;
    const costBasisTotal = h.totalCost;
    // No price or no exchange rate: value the position at cost rather than at 0.
    const priceAvailable = p.priced;
    const currentValue = p.value;
    const gainLoss = priceAvailable ? currentValue - costBasisTotal : null;
    const gainLossPct = gainLoss !== null && costBasisTotal > 0 ? (gainLoss / costBasisTotal) * 100 : null;

    return {
      ticker: h.ticker,
      assetType: h.assetType,
      name: p.name ?? h.ticker,
      quantity: h.quantity,
      // In the user's currency.
      avgCostBasis,
      costBasisTotal,
      currentValue,
      gainLoss,
      gainLossPct,
      // In the asset's own currency.
      currentPrice: p.price,
      currency: p.currency,
      fxRate: p.fx,
      priceAvailable,
      dayChange: p.dayChange,
      dayChangePercent: p.dayChangePercent,
    };
  });

  const priced = portfolio.filter((h) => h.priceAvailable);
  const totalValue = portfolio.reduce((s, h) => s + h.currentValue, 0);
  const totalGainLoss = priced.reduce((s, h) => s + (h.gainLoss ?? 0), 0);
  const pricedCost = priced.reduce((s, h) => s + h.costBasisTotal, 0);
  const currencies = [...new Set(portfolio.map((h) => h.currency).filter((c): c is string => !!c && c !== user.currency))];

  // Investment accounts (and any other account holding trades), each with its cash and its own holdings.
  const valueOf = (ticker: string, quantity: number, cost: number) => {
    const p = prices.get(ticker);
    return p?.priced && p.price != null && p.fx != null ? quantity * p.price * p.fx : cost;
  };
  const [accounts, txnSums, cashFromTrades] = await Promise.all([
    prisma.account.findMany({
      where: { userId, OR: [{ type: "investment" }, { investmentTrades: { some: {} } }] },
      orderBy: { name: "asc" },
    }),
    Promise.all([
      prisma.transaction.groupBy({
        by: ["toAccountId"],
        where: { userId, status: "PAID", date: { lte: endOfTodayUtc() }, toAccountId: { not: null } },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["fromAccountId"],
        where: { userId, status: "PAID", date: { lte: endOfTodayUtc() }, fromAccountId: { not: null } },
        _sum: { amount: true },
      }),
    ]),
    tradeCashByAccount(userId),
  ]);
  const inBy = new Map(txnSums[0].map((g) => [g.toAccountId, g._sum.amount ?? 0]));
  const outBy = new Map(txnSums[1].map((g) => [g.fromAccountId, g._sum.amount ?? 0]));
  const byAccount = accounts.map((a) => {
    const own = aggregateHoldings(trades.filter((t) => t.accountId === a.id)).map((h) => {
      const value = valueOf(h.ticker, h.quantity, h.totalCost);
      return { ticker: h.ticker, assetType: h.assetType, quantity: h.quantity, costBasisTotal: h.totalCost, currentValue: value };
    });
    const cash = (inBy.get(a.id) ?? 0) - (outBy.get(a.id) ?? 0) + (cashFromTrades.get(a.id) ?? 0);
    const holdingsValue = own.reduce((s, h) => s + h.currentValue, 0);
    return { id: a.id, name: a.name, type: a.type, cash, holdingsValue, total: cash + holdingsValue, holdings: own };
  });

  res.json({
    accounts: byAccount,
    holdings: portfolio,
    summary: {
      totalValue,
      totalCostBasis: portfolio.reduce((s, h) => s + h.costBasisTotal, 0),
      totalGainLoss,
      totalGainLossPct: pricedCost > 0 ? (totalGainLoss / pricedCost) * 100 : 0,
      holdingsCount: portfolio.length,
      unpricedCount: portfolio.length - priced.length,
      // Currencies other than the user's that holdings are priced in (converted at today's rates).
      currencies,
      baseCurrency: user.currency,
      lastUpdated: priced.length ? new Date().toISOString() : null,
    },
  });
});

// Exchange rate: value of 1 `from` in `to` (default: the user's currency), today or on ?date=YYYY-MM-DD
router.get("/fx", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { currency: true } });
  const from = String(req.query.from ?? "").toUpperCase();
  const to = String(req.query.to ?? user.currency).toUpperCase();
  if (!CURRENCY_CODE.test(from) || !CURRENCY_CODE.test(to)) return res.status(400).json({ error: "from and to must be 3-letter currency codes" });
  const date = req.query.date ? parseDate(req.query.date, "date")! : undefined;
  try {
    res.json({ from, to, date: date?.toISOString().slice(0, 10) ?? null, rate: await fxRate(from, to, date) });
  } catch (e: any) {
    res.status(502).json({ error: `No exchange rate for ${from} to ${to} right now` });
  }
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
