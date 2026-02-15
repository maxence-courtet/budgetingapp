import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET / - search transactions with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      query,
      accountId,
      categoryId,
      type,
      status,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      monthId,
    } = req.query;

    const where: any = { userId };

    // Text search on description
    if (query) {
      where.description = {
        contains: query as string,
      };
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (monthId) {
      where.monthId = monthId as string;
    }

    if (accountId) {
      where.OR = [
        { fromAccountId: accountId as string },
        { toAccountId: accountId as string },
      ];
    }

    // Date range filters
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo as string);
      }
    }

    // Amount range filters
    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) {
        where.amount.gte = parseFloat(amountMin as string);
      }
      if (amountMax) {
        where.amount.lte = parseFloat(amountMax as string);
      }
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
      take: 100,
    });

    res.json({
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({ error: 'Failed to search transactions' });
  }
});

export const searchRoutes = router;
