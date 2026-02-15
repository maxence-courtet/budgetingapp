import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET /account-summary - returns all accounts with balances and category breakdowns
router.get('/account-summary', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(
      accounts.map(async (account) => {
        const paidTransactions = await prisma.transaction.findMany({
          where: {
            status: 'PAID',
            userId,
            OR: [{ fromAccountId: account.id }, { toAccountId: account.id }],
          },
          include: { category: true },
        });

        const categoryMap = new Map<string, { id: string; name: string; in: number; out: number }>();

        for (const t of paidTransactions) {
          if (t.fromAccountId === account.id) {
            const catId = t.categoryId;
            const cat = categoryMap.get(catId) || { id: catId, name: t.category.name, in: 0, out: 0 };
            cat.out += t.amount;
            categoryMap.set(catId, cat);
          }
          if (t.toAccountId === account.id) {
            const catId = (t.type === 'TRANSFER' && t.toCategoryId) ? t.toCategoryId : t.categoryId;
            let catName = t.category.name;
            if (catId !== t.categoryId) {
              const toCat = await prisma.category.findUnique({ where: { id: catId } });
              catName = toCat?.name || 'Unknown';
            }
            const cat = categoryMap.get(catId) || { id: catId, name: catName, in: 0, out: 0 };
            cat.in += t.amount;
            categoryMap.set(catId, cat);
          }
        }

        const categories = Array.from(categoryMap.values()).map((c) => ({
          ...c,
          balance: c.in - c.out,
        }));

        const totalIn = paidTransactions
          .filter((t) => t.toAccountId === account.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const totalOut = paidTransactions
          .filter((t) => t.fromAccountId === account.id)
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          id: account.id,
          name: account.name,
          type: account.type,
          notes: account.notes,
          balance: totalIn - totalOut,
          totalIn,
          totalOut,
          categories,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error('Error getting account summary:', error);
    res.status(500).json({ error: 'Failed to get account summary' });
  }
});

// GET /category-detail?accountId=X&categoryId=Y
router.get('/category-detail', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { accountId, categoryId } = req.query;

    if (!accountId || !categoryId) {
      return res.status(400).json({ error: 'accountId and categoryId are required' });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'PAID',
        userId,
        OR: [
          { fromAccountId: accountId as string, categoryId: categoryId as string },
          { toAccountId: accountId as string, categoryId: categoryId as string },
          { toAccountId: accountId as string, toCategoryId: categoryId as string },
        ],
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
      orderBy: { date: 'desc' },
    });

    let totalIn = 0;
    let totalOut = 0;
    const result = transactions.map((t) => {
      const isIncoming = t.toAccountId === (accountId as string);
      if (isIncoming) totalIn += t.amount;
      else totalOut += t.amount;
      return { ...t, direction: isIncoming ? 'in' as const : 'out' as const };
    });

    res.json({
      accountId,
      categoryId,
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      transactions: result,
    });
  } catch (error) {
    console.error('Error getting category detail:', error);
    res.status(500).json({ error: 'Failed to get category detail' });
  }
});

// GET /monthly-summary/:monthId
router.get('/monthly-summary/:monthId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { monthId } = req.params;

    const month = await prisma.month.findFirst({
      where: { id: monthId, userId },
      include: {
        transactions: { include: { category: true } },
      },
    });

    if (!month) {
      return res.status(404).json({ error: 'Month not found' });
    }

    const paid = month.transactions.filter((t) => t.status === 'PAID');
    const planned = month.transactions.filter((t) => t.status === 'PLANNED');

    const summarize = (txns: typeof month.transactions) => {
      const income = txns.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const spending = txns.filter((t) => t.type === 'SPENDING').reduce((sum, t) => sum + t.amount, 0);
      const transfers = txns.filter((t) => t.type === 'TRANSFER').reduce((sum, t) => sum + t.amount, 0);
      return { income, spending, transfers, net: income - spending };
    };

    const categoryMap = new Map<string, { id: string; name: string; income: number; spending: number }>();
    for (const t of paid) {
      if (t.type === 'TRANSFER') continue;
      const cat = categoryMap.get(t.categoryId) || { id: t.categoryId, name: t.category.name, income: 0, spending: 0 };
      if (t.type === 'INCOME') cat.income += t.amount;
      if (t.type === 'SPENDING') cat.spending += t.amount;
      categoryMap.set(t.categoryId, cat);
    }

    const categoryBreakdown = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      net: c.income - c.spending,
    }));

    res.json({
      monthId,
      month: month.month,
      year: month.year,
      totalTransactions: month.transactions.length,
      paid: summarize(paid),
      planned: summarize(planned),
      all: summarize(month.transactions),
      categoryBreakdown,
    });
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    res.status(500).json({ error: 'Failed to get monthly summary' });
  }
});

export const reportRoutes = router;
