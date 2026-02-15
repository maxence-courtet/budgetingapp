import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET / - list transactions with query filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { monthId, categoryId, accountId, type, status, limit, offset } = req.query;

    const where: any = {};

    if (monthId) where.monthId = monthId as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (type) where.type = type as string;
    if (status) where.status = status as string;
    if (accountId) {
      where.OR = [
        { fromAccountId: accountId as string },
        { toAccountId: accountId as string },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
      orderBy: { date: 'desc' },
      take: limit ? parseInt(limit as string, 10) : undefined,
      skip: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error listing transactions:', error);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// GET /:id - get single transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// POST / - create transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      type,
      date,
      amount,
      description,
      status,
      categoryId,
      monthId,
      fromAccountId,
      toAccountId,
      toCategoryId,
    } = req.body;

    if (!type || !date || amount === undefined || !categoryId || !monthId) {
      return res.status(400).json({ error: 'type, date, amount, categoryId, and monthId are required' });
    }

    if (type === 'INCOME' && !toAccountId) {
      return res.status(400).json({ error: 'toAccountId is required for INCOME' });
    }
    if (type === 'SPENDING' && !fromAccountId) {
      return res.status(400).json({ error: 'fromAccountId is required for SPENDING' });
    }
    if (type === 'TRANSFER' && (!fromAccountId || !toAccountId)) {
      return res.status(400).json({ error: 'fromAccountId and toAccountId are required for TRANSFER' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        date: new Date(date),
        amount,
        description,
        status: status || 'PLANNED',
        categoryId,
        toCategoryId: type === 'TRANSFER' ? (toCategoryId || categoryId) : null,
        monthId,
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /:id - update transaction
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      type,
      date,
      amount,
      description,
      status,
      categoryId,
      monthId,
      fromAccountId,
      toAccountId,
      toCategoryId,
    } = req.body;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const data: any = {};
    if (type !== undefined) data.type = type;
    if (date !== undefined) data.date = new Date(date);
    if (amount !== undefined) data.amount = amount;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (toCategoryId !== undefined) data.toCategoryId = toCategoryId;
    if (monthId !== undefined) data.monthId = monthId;
    if (fromAccountId !== undefined) data.fromAccountId = fromAccountId;
    if (toAccountId !== undefined) data.toAccountId = toAccountId;

    const updated = await prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /:id - delete transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// PATCH /:id/status - update just the status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PLANNED', 'PAID', 'PENDING', 'SKIPPED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction status:', error);
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

export const transactionRoutes = router;
