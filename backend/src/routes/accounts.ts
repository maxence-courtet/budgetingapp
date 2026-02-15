import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET / - list all accounts with calculated balances
router.get('/', async (_req: Request, res: Response) => {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { name: 'asc' },
    });

    // Calculate balances for all accounts
    const result = await Promise.all(
      accounts.map(async (account) => {
        const incoming = await prisma.transaction.aggregate({
          where: { toAccountId: account.id, status: 'PAID' },
          _sum: { amount: true },
        });
        const outgoing = await prisma.transaction.aggregate({
          where: { fromAccountId: account.id, status: 'PAID' },
          _sum: { amount: true },
        });
        const balance = (incoming._sum.amount || 0) - (outgoing._sum.amount || 0);
        return { ...account, balance };
      })
    );

    res.json(result);
  } catch (error) {
    console.error('Error listing accounts:', error);
    res.status(500).json({ error: 'Failed to list accounts' });
  }
});

// GET /:id - get account detail with category balances and transactions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Get all PAID transactions involving this account
    const paidTransactions = await prisma.transaction.findMany({
      where: {
        status: 'PAID',
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
    const transactions = await prisma.transaction.findMany({
      where: {
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

    const incoming = paidTransactions
      .filter((t) => t.toAccountId === id)
      .reduce((sum, t) => sum + t.amount, 0);
    const outgoing = paidTransactions
      .filter((t) => t.fromAccountId === id)
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      ...account,
      balance: incoming - outgoing,
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
    const { name, type, notes } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const account = await prisma.account.create({
      data: { name, type, notes },
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PUT /:id - update account
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, notes } = req.body;

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const account = await prisma.account.update({
      where: { id },
      data: { name, type, notes },
    });

    res.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE /:id - delete account (check for transactions first)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const transactionCount = await prisma.transaction.count({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete account with existing transactions',
        transactionCount,
      });
    }

    const definitionCount = await prisma.budgetTransactionDefinition.count({
      where: { OR: [{ fromAccountId: id }, { toAccountId: id }] },
    });

    if (definitionCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete account referenced by budget definitions',
        definitionCount,
      });
    }

    await prisma.account.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export const accountRoutes = router;
