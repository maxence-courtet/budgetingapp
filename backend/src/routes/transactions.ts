import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';
import { date as parseDate, normalizeMoneyFlow, oneOf, sendError, text, BadRequest, TRANSACTION_STATUSES } from '../services/validate';
import { assertOwnIds, assertOwnRefs } from '../services/ownership';

const router = Router();

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A transaction must be dated inside the month it belongs to. */
async function assertDateInMonth(userId: string, monthId: string, date: Date) {
  const month = await prisma.month.findFirst({ where: { id: monthId, userId } });
  if (!month) throw new BadRequest('Month not found');
  if (date.getUTCFullYear() !== month.year || date.getUTCMonth() + 1 !== month.month) {
    throw new BadRequest(`The date must be in ${MONTH_NAMES[month.month - 1]} ${month.year}`);
  }
}

// GET / - list transactions with query filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { monthId, categoryId, accountId, type, status, limit, offset, until } = req.query;

    const where: any = { userId };

    if (monthId) where.monthId = monthId as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (type) where.type = type as string;
    if (status) where.status = status as string;
    // ?until=YYYY-MM-DD: only transactions dated on or before that day (e.g. "recent activity" excludes future ones)
    if (until) where.date = { lte: new Date(parseDate(until, 'until')!.getTime() + 86_400_000 - 1) };
    if (accountId) {
      where.OR = [
        { fromAccountId: accountId as string },
        { toAccountId: accountId as string },
      ];
    }

    const rawTransactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        month: true,
      },
      orderBy: { date: 'desc' },
      take: limit ? Math.max(1, parseInt(limit as string, 10) || 50) : undefined,
      skip: offset ? Math.max(0, parseInt(offset as string, 10) || 0) : undefined,
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

    res.json(transactions);
  } catch (error) {
    sendError(res, error, 'Failed to list transactions');
  }
});

// GET /:id - get single transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId },
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
    const userId = req.userId!;
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

    if (!categoryId || !monthId) {
      return res.status(400).json({ error: 'categoryId and monthId are required' });
    }
    const flow = normalizeMoneyFlow({ type, amount, fromAccountId, toAccountId, categoryId, toCategoryId });
    await assertOwnRefs(userId, { ...flow, categoryId });
    const when = parseDate(date, 'date')!;
    const txStatus = oneOf(status, 'status', TRANSACTION_STATUSES, { optional: true }) ?? 'PLANNED';
    await assertDateInMonth(userId, monthId, when);

    const transaction = await prisma.transaction.create({
      data: {
        ...flow,
        date: when,
        description,
        status: txStatus,
        categoryId,
        monthId,
        userId,
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
    sendError(res, error, 'Failed to create transaction');
  }
});

// POST /import - create up to 500 transactions in one request, all or nothing (used to bring in existing data,
// e.g. by an AI assistant through MCP). Same rules as POST /: accounts, categories and months must be the user's
// and each date must fall in its month. Without a monthId, the month containing the date is used (created if needed).
const IMPORT_MAX = 500;
router.post('/import', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const items = req.body?.transactions;
    if (!Array.isArray(items) || items.length === 0) throw new BadRequest('transactions must be a non-empty array');
    if (items.length > IMPORT_MAX) throw new BadRequest(`At most ${IMPORT_MAX} transactions per import`);

    const rows = items.map((t: any, i: number) => {
      try {
        if (!t || typeof t !== 'object') throw new BadRequest('must be an object');
        if (!t.categoryId) throw new BadRequest('categoryId is required');
        const flow = normalizeMoneyFlow(t);
        return {
          ...flow,
          categoryId: String(t.categoryId),
          date: parseDate(t.date, 'date')!,
          description: text(t.description, 'description', { optional: true, max: 500 }),
          status: oneOf(t.status, 'status', TRANSACTION_STATUSES, { optional: true }) ?? 'PLANNED',
          monthId: t.monthId ? String(t.monthId) : null,
        };
      } catch (error) {
        if (error instanceof BadRequest) throw new BadRequest(`Transaction ${i + 1}: ${error.message}`);
        throw error;
      }
    });

    await assertOwnIds(
      userId,
      rows.flatMap((r) => [r.fromAccountId, r.toAccountId]),
      rows.flatMap((r) => [r.categoryId, r.toCategoryId])
    );

    const created = await prisma.$transaction(async (tx) => {
      // Months named explicitly must be the user's and contain the date.
      const givenIds = [...new Set(rows.map((r) => r.monthId).filter((x): x is string => !!x))];
      const given = new Map((await tx.month.findMany({ where: { id: { in: givenIds }, userId } })).map((m) => [m.id, m]));
      // Otherwise use (or create) the month the date falls in.
      const byKey = new Map<string, string>();
      const key = (year: number, month: number) => `${year}-${month}`;
      for (const m of await tx.month.findMany({ where: { userId } })) byKey.set(key(m.year, m.month), m.id);

      const data = [];
      for (const [i, r] of rows.entries()) {
        const year = r.date.getUTCFullYear();
        const month = r.date.getUTCMonth() + 1;
        let monthId = r.monthId;
        if (monthId) {
          const m = given.get(monthId);
          if (!m) throw new BadRequest(`Transaction ${i + 1}: Month not found`);
          if (m.year !== year || m.month !== month) {
            throw new BadRequest(`Transaction ${i + 1}: the date must be in ${MONTH_NAMES[m.month - 1]} ${m.year}`);
          }
        } else {
          monthId = byKey.get(key(year, month)) ?? null;
          if (!monthId) {
            monthId = (await tx.month.create({ data: { month, year, userId } })).id;
            byKey.set(key(year, month), monthId);
          }
        }
        data.push({ ...r, monthId, userId });
      }
      return tx.transaction.createMany({ data });
    }, { timeout: 30_000 });

    res.status(201).json({ created: created.count });
  } catch (error) {
    sendError(res, error, 'Failed to import transactions');
  }
});

// PUT /:id - update transaction
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
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

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const merged = {
      type: type ?? existing.type,
      amount: amount ?? existing.amount,
      fromAccountId: fromAccountId !== undefined ? fromAccountId : existing.fromAccountId,
      toAccountId: toAccountId !== undefined ? toAccountId : existing.toAccountId,
      categoryId: categoryId ?? existing.categoryId,
      toCategoryId: toCategoryId !== undefined ? toCategoryId : existing.toCategoryId,
    };
    const flow = normalizeMoneyFlow(merged);
    await assertOwnRefs(userId, { ...flow, categoryId: merged.categoryId });
    const when = date !== undefined ? parseDate(date, 'date')! : existing.date;
    const targetMonth = monthId ?? existing.monthId;
    if (date !== undefined || monthId !== undefined) await assertDateInMonth(userId, targetMonth, when);

    const data: any = { ...flow, categoryId: merged.categoryId, date: when, monthId: targetMonth };
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = oneOf(status, 'status', TRANSACTION_STATUSES);

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
    sendError(res, error, 'Failed to update transaction');
  }
});

// DELETE /:id - delete transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
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
    const userId = req.userId!;
    const { status } = req.body;

    const validStatuses = ['PLANNED', 'PAID', 'PENDING', 'SKIPPED'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
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
