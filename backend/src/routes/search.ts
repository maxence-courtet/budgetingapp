import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { date as parseDate, num, sendError } from '../services/validate';

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
        mode: 'insensitive',
      };
    }

    // A transfer matches its destination category too.
    const and: any[] = [];
    if (categoryId) {
      and.push({ OR: [{ categoryId: categoryId as string }, { toCategoryId: categoryId as string }] });
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
      and.push({ OR: [{ fromAccountId: accountId as string }, { toAccountId: accountId as string }] });
    }
    if (and.length) where.AND = and;

    // Date range filters
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = parseDate(dateFrom, 'dateFrom');
      }
      if (dateTo) {
        // inclusive: the whole "to" day
        where.date.lte = new Date(parseDate(dateTo, 'dateTo')!.getTime() + 86_400_000 - 1);
      }
    }

    // Amount range filters
    if (amountMin || amountMax) {
      where.amount = {};
      if (amountMin) {
        where.amount.gte = num(amountMin, 'amountMin');
      }
      if (amountMax) {
        where.amount.lte = num(amountMax, 'amountMax');
      }
    }

    const LIMIT = 100;
    const [total, transactions] = await Promise.all([prisma.transaction.count({ where }), prisma.transaction.findMany({
      where,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
      orderBy: { date: 'desc' },
      take: LIMIT,
    })]);

    res.json({
      count: transactions.length,
      total,
      truncated: total > transactions.length,
      transactions,
    });
  } catch (error) {
    sendError(res, error, 'Failed to search transactions');
  }
});

export const searchRoutes = router;
