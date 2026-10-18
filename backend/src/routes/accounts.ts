import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { text, normalizeAccountType, sendError, endOfTodayUtc } from '../services/validate';
import { tradeCashByAccount } from '../services/portfolio';

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

const router = Router();

// GET / - list all accounts with calculated balances
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    // Balances as of today in two grouped queries (not two per account):
    // PAID transactions dated in the future don't count yet.
    const asOfToday = { userId, status: 'PAID', date: { lte: endOfTodayUtc() } };
    const [incoming, outgoing, trades] = await Promise.all([
      prisma.transaction.groupBy({ by: ['toAccountId'], where: { ...asOfToday, toAccountId: { not: null } }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['fromAccountId'], where: { ...asOfToday, fromAccountId: { not: null } }, _sum: { amount: true } }),
      tradeCashByAccount(userId),
    ]);
    const inBy = new Map(incoming.map((g) => [g.toAccountId, g._sum.amount ?? 0]));
    const outBy = new Map(outgoing.map((g) => [g.fromAccountId, g._sum.amount ?? 0]));
    const result = accounts.map((account) => ({
      ...account,
      // Buys and sells move the account's cash (see tradeCash).
      balance: (inBy.get(account.id) ?? 0) - (outBy.get(account.id) ?? 0) + (trades.get(account.id) ?? 0),
    }));

    res.json(result.sort(byName));
  } catch (error) {
    console.error('Error listing accounts:', error);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// GET /:id - get account detail with category balances and transactions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const account = await prisma.account.findFirst({ where: { id, userId } });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get all PAID transactions involving this account
    const paidTransactions = await prisma.transaction.findMany({
      where: {
        status: 'PAID',
        userId,
        date: { lte: endOfTodayUtc() },
        OR: [{ fromAccountId: id }, { toAccountId: id }],
      },
      include: { category: true },
    });

    // Calculate category balances per account
    const categoryMap = new Map<string, { id: string; name: string; balance: number }>();

    for (const t of paidTransactions) {
      // If this account is the fromAccount, it loses money under categoryId
      if (t.fromAccountId === id) {
        const catId = t.categoryId;
        const cat = categoryMap.get(catId) || { id: catId, name: t.category.name, balance: 0 };
        cat.balance -= t.amount;
        categoryMap.set(catId, cat);
      }
      // If this account is the toAccount, it gains money
      // For transfers, use toCategoryId; for income, use categoryId
      if (t.toAccountId === id) {
        const catId = (t.type === 'TRANSFER' && t.toCategoryId) ? t.toCategoryId : t.categoryId;
        // Need to look up category name if it's toCategoryId
        let catName = t.category.name;
        if (catId !== t.categoryId) {
          const toCat = await prisma.category.findUnique({ where: { id: catId } });
          catName = toCat?.name || 'Unknown';
        }
        const cat = categoryMap.get(catId) || { id: catId, name: catName, balance: 0 };
        cat.balance += t.amount;
        categoryMap.set(catId, cat);
      }
    }

    const categoryBalances = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Get ALL transactions for this account (not just PAID) for display
    const rawTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ fromAccountId: id }, { toAccountId: id }],
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
      orderBy: { date: 'desc' },
    });

    // Enrich transfers with toCategory data
    const toCategoryIds = [...new Set(rawTransactions.filter(t => t.toCategoryId).map(t => t.toCategoryId!))];
    const toCategories = toCategoryIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: toCategoryIds } } })
      : [];
    const toCategoryMap = new Map(toCategories.map(c => [c.id, c]));

    const transactions = rawTransactions.map(t => ({
      ...t,
      toCategory: t.toCategoryId ? toCategoryMap.get(t.toCategoryId) ?? null : null,
    }));

    const incoming = paidTransactions
      .filter((t) => t.toAccountId === id)
      .reduce((sum, t) => sum + t.amount, 0);
    const outgoing = paidTransactions
      .filter((t) => t.fromAccountId === id)
      .reduce((sum, t) => sum + t.amount, 0);

    const tradesNet = (await tradeCashByAccount(userId, id)).get(id) ?? 0;

    res.json({
      ...account,
      balance: incoming - outgoing + tradesNet,
      // Cash spent on buys (negative) or received from sells, fees included; not part of categoryBalances.
      tradesNet,
      categoryBalances,
      transactions,
    });
  } catch (error) {
    console.error('Error getting account:', error);
    res.status(500).json({ error: 'Failed to get account' });
  }
});

// POST / - create account
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const name = text(req.body.name, 'Name', { max: 60 })!;
    const type = normalizeAccountType(req.body.type);
    const notes = text(req.body.notes, 'Notes', { optional: true, max: 500 });

    const clash = await prisma.account.findFirst({ where: { userId, name: { equals: name, mode: 'insensitive' } } });
    if (clash) return res.status(409).json({ error: 'An account with this name already exists' });

    const account = await prisma.account.create({
      data: { name, type, notes, userId },
    });

    res.status(201).json(account);
  } catch (error) {
    sendError(res, error, 'Failed to create account');
  }
});

// PUT /:id - update account
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const data: { name?: string; type?: string; notes?: string | null } = {};
    if (req.body.name !== undefined) {
      data.name = text(req.body.name, 'Name', { max: 60 })!;
      const clash = await prisma.account.findFirst({
        where: { userId, id: { not: id }, name: { equals: data.name, mode: 'insensitive' } },
      });
      if (clash) return res.status(409).json({ error: 'An account with this name already exists' });
    }
    if (req.body.type !== undefined) data.type = normalizeAccountType(req.body.type);
    // null or "" clears the notes
    if (req.body.notes !== undefined) data.notes = text(req.body.notes, 'Notes', { optional: true, max: 500 });

    const account = await prisma.account.update({
      where: { id },
      data,
    });

    res.json(account);
  } catch (error) {
    sendError(res, error, 'Failed to update account');
  }
});

// DELETE /:id - delete account (check for transactions first)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactionCount = await prisma.transaction.count({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }], userId },
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete account with existing transactions',
        transactionCount,
      });
    }

    const definitionCount = await prisma.budgetTransactionDefinition.count({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }], userId },
    });

    if (definitionCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete account referenced by budget definitions',
        definitionCount,
      });
    }

    const tradeCount = await prisma.investmentTrade.count({ where: { accountId: id, userId } });
    if (tradeCount > 0) {
      return res.status(409).json({ error: 'Cannot delete account with investment trades', tradeCount });
    }

    await prisma.account.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export const accountRoutes = router;
