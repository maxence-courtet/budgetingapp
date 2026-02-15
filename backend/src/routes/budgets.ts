import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET / - list all budget templates with definition count and months used count
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const templates = await prisma.budgetTemplate.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            definitions: true,
            months: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = templates.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      modifiedAt: t.modifiedAt,
      definitionCount: t._count.definitions,
      monthsUsedCount: t._count.months,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing budget templates:', error);
    res.status(500).json({ error: 'Failed to list budget templates' });
  }
});

// GET /:id - get budget template with all definitions
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const template = await prisma.budgetTemplate.findFirst({
      where: { id, userId },
      include: {
        definitions: {
          include: {
            category: true,
            fromAccount: true,
            toAccount: true,
          },
          orderBy: { type: 'asc' },
        },
        months: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Budget template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error getting budget template:', error);
    res.status(500).json({ error: 'Failed to get budget template' });
  }
});

// POST / - create budget template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.userId!;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const template = await prisma.budgetTemplate.create({
      data: { name, userId },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating budget template:', error);
    res.status(500).json({ error: 'Failed to create budget template' });
  }
});

// PUT /:id - update budget template name
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.userId!;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.budgetTemplate.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Budget template not found' });
    }

    const template = await prisma.budgetTemplate.update({
      where: { id },
      data: { name },
    });

    res.json(template);
  } catch (error) {
    console.error('Error updating budget template:', error);
    res.status(500).json({ error: 'Failed to update budget template' });
  }
});

// DELETE /:id - delete budget template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const existing = await prisma.budgetTemplate.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ error: 'Budget template not found' });
    }

    // Cascade delete will handle definitions
    await prisma.budgetTemplate.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting budget template:', error);
    res.status(500).json({ error: 'Failed to delete budget template' });
  }
});

// POST /:id/definitions - add a definition to template
router.post('/:id/definitions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { type, amount, description, categoryId, fromAccountId, toAccountId, toCategoryId } = req.body;

    if (!type || amount === undefined || !categoryId) {
      return res.status(400).json({ error: 'type, amount, and categoryId are required' });
    }

    const template = await prisma.budgetTemplate.findFirst({ where: { id, userId } });
    if (!template) {
      return res.status(404).json({ error: 'Budget template not found' });
    }

    if (type === 'TRANSFER' && (!fromAccountId || !toAccountId)) {
      return res.status(400).json({ error: 'fromAccountId and toAccountId are required for transfer definitions' });
    }

    const definition = await prisma.budgetTransactionDefinition.create({
      data: {
        type,
        amount,
        description,
        categoryId,
        budgetTemplateId: id,
        fromAccountId,
        toAccountId,
        toCategoryId,
        userId,
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
      },
    });

    res.status(201).json(definition);
  } catch (error) {
    console.error('Error adding budget definition:', error);
    res.status(500).json({ error: 'Failed to add budget definition' });
  }
});

// PUT /:id/definitions/:defId - update a definition
router.put('/:id/definitions/:defId', async (req: Request, res: Response) => {
  try {
    const { id, defId } = req.params;
    const userId = req.userId!;
    const { type, amount, description, categoryId, fromAccountId, toAccountId, toCategoryId } = req.body;

    const existing = await prisma.budgetTransactionDefinition.findFirst({
      where: { id: defId, budgetTemplateId: id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Budget definition not found' });
    }

    const data: any = {};
    if (type !== undefined) data.type = type;
    if (amount !== undefined) data.amount = amount;
    if (description !== undefined) data.description = description;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (fromAccountId !== undefined) data.fromAccountId = fromAccountId;
    if (toAccountId !== undefined) data.toAccountId = toAccountId;
    if (toCategoryId !== undefined) data.toCategoryId = toCategoryId;

    const definition = await prisma.budgetTransactionDefinition.update({
      where: { id: defId },
      data,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
      },
    });

    res.json(definition);
  } catch (error) {
    console.error('Error updating budget definition:', error);
    res.status(500).json({ error: 'Failed to update budget definition' });
  }
});

// DELETE /:id/definitions/:defId - delete a definition
router.delete('/:id/definitions/:defId', async (req: Request, res: Response) => {
  try {
    const { id, defId } = req.params;
    const userId = req.userId!;

    const existing = await prisma.budgetTransactionDefinition.findFirst({
      where: { id: defId, budgetTemplateId: id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Budget definition not found' });
    }

    await prisma.budgetTransactionDefinition.delete({ where: { id: defId } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting budget definition:', error);
    res.status(500).json({ error: 'Failed to delete budget definition' });
  }
});

export const budgetRoutes = router;
