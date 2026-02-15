import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET / - list all months with transaction counts and summary
router.get('/', async (_req: Request, res: Response) => {
  try {
    const months = await prisma.month.findMany({
      include: {
        budgetTemplate: { select: { id: true, name: true } },
        transactions: {
          select: { type: true, amount: true, status: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const result = months.map((m) => {
      const income = m.transactions
        .filter((t) => t.type === 'INCOME' && t.status === 'PAID')
        .reduce((sum, t) => sum + t.amount, 0);
      const spending = m.transactions
        .filter((t) => t.type === 'SPENDING' && t.status === 'PAID')
        .reduce((sum, t) => sum + t.amount, 0);
      const plannedIncome = m.transactions
        .filter((t) => t.type === 'INCOME' && t.status === 'PLANNED')
        .reduce((sum, t) => sum + t.amount, 0);
      const plannedSpending = m.transactions
        .filter((t) => t.type === 'SPENDING' && t.status === 'PLANNED')
        .reduce((sum, t) => sum + t.amount, 0);

      const { transactions, ...rest } = m;
      return {
        ...rest,
        transactionCount: transactions.length,
        income,
        spending,
        plannedIncome,
        plannedSpending,
        net: income - spending,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing months:', error);
    res.status(500).json({ error: 'Failed to list months' });
  }
});

// GET /:id - get month detail with all transactions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const month = await prisma.month.findUnique({
      where: { id },
      include: {
        budgetTemplate: { select: { id: true, name: true } },
        transactions: {
          include: {
            category: true,
            fromAccount: true,
            toAccount: true,
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!month) {
      return res.status(404).json({ error: 'Month not found' });
    }

    res.json(month);
  } catch (error) {
    console.error('Error getting month:', error);
    res.status(500).json({ error: 'Failed to get month' });
  }
});

// POST / - create month (with optional budgetTemplateId to auto-apply)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { month: monthNum, year, budgetTemplateId } = req.body;

    if (monthNum === undefined || year === undefined) {
      return res.status(400).json({ error: 'month and year are required' });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    const existing = await prisma.month.findUnique({
      where: { month_year: { month: monthNum, year } },
    });
    if (existing) {
      return res.status(409).json({ error: 'A month with this month/year already exists' });
    }

    if (budgetTemplateId) {
      const template = await prisma.budgetTemplate.findUnique({
        where: { id: budgetTemplateId },
      });
      if (!template) {
        return res.status(400).json({ error: 'Budget template not found' });
      }
    }

    const newMonth = await prisma.month.create({
      data: {
        month: monthNum,
        year,
        budgetTemplateId: budgetTemplateId || null,
      },
    });

    if (budgetTemplateId) {
      await applyBudgetToMonth(newMonth.id, budgetTemplateId, monthNum, year);
    }

    const result = await prisma.month.findUnique({
      where: { id: newMonth.id },
      include: {
        budgetTemplate: { select: { id: true, name: true } },
        transactions: {
          include: { category: true, fromAccount: true, toAccount: true },
        },
      },
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating month:', error);
    res.status(500).json({ error: 'Failed to create month' });
  }
});

// PUT /:id - update month
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { month: monthNum, year, budgetTemplateId } = req.body;

    const existing = await prisma.month.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Month not found' });
    }

    const data: any = {};
    if (monthNum !== undefined) data.month = monthNum;
    if (year !== undefined) data.year = year;
    if (budgetTemplateId !== undefined) data.budgetTemplateId = budgetTemplateId || null;

    const updated = await prisma.month.update({
      where: { id },
      data,
      include: { budgetTemplate: { select: { id: true, name: true } } },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating month:', error);
    res.status(500).json({ error: 'Failed to update month' });
  }
});

// DELETE /:id - delete month and all its transactions
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.month.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Month not found' });
    }

    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { monthId: id } }),
      prisma.month.delete({ where: { id } }),
    ]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting month:', error);
    res.status(500).json({ error: 'Failed to delete month' });
  }
});

// POST /:id/apply-budget - apply a budget template to an existing month
router.post('/:id/apply-budget', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { budgetTemplateId } = req.body;

    if (!budgetTemplateId) {
      return res.status(400).json({ error: 'budgetTemplateId is required' });
    }

    const month = await prisma.month.findUnique({ where: { id } });
    if (!month) {
      return res.status(404).json({ error: 'Month not found' });
    }

    const template = await prisma.budgetTemplate.findUnique({
      where: { id: budgetTemplateId },
    });
    if (!template) {
      return res.status(404).json({ error: 'Budget template not found' });
    }

    await applyBudgetToMonth(id, budgetTemplateId, month.month, month.year);

    await prisma.month.update({
      where: { id },
      data: { budgetTemplateId },
    });

    const result = await prisma.month.findUnique({
      where: { id },
      include: {
        budgetTemplate: { select: { id: true, name: true } },
        transactions: {
          include: { category: true, fromAccount: true, toAccount: true },
          orderBy: { date: 'asc' },
        },
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Error applying budget:', error);
    res.status(500).json({ error: 'Failed to apply budget template' });
  }
});

// Helper: apply budget template definitions to a month
async function applyBudgetToMonth(
  monthId: string,
  budgetTemplateId: string,
  monthNum: number,
  year: number,
) {
  const definitions = await prisma.budgetTransactionDefinition.findMany({
    where: { budgetTemplateId },
  });

  const firstDayOfMonth = new Date(year, monthNum - 1, 1);

  const createOps = definitions.map((def) =>
    prisma.transaction.create({
      data: {
        type: def.type,
        date: firstDayOfMonth,
        amount: def.amount,
        description: def.description,
        status: 'PLANNED',
        categoryId: def.categoryId,
        toCategoryId: def.type === 'TRANSFER' ? (def.toCategoryId || def.categoryId) : null,
        monthId,
        fromAccountId: def.fromAccountId,
        toAccountId: def.toAccountId,
      },
    })
  );

  if (createOps.length > 0) {
    await prisma.$transaction(createOps);
  }
}

export const monthRoutes = router;
