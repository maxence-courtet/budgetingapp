import { Router, Request, Response } from 'express';
import prisma from '../services/prisma';

const router = Router();

// GET / - list all categories with usage count
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            transactions: true,
            budgetDefinitions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      createdAt: cat.createdAt,
      transactionCount: cat._count.transactions,
      budgetDefinitionCount: cat._count.budgetDefinitions,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

// POST / - create category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: { name },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /:id - update category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check for name conflict with a different category
    const nameConflict = await prisma.category.findUnique({ where: { name } });
    if (nameConflict && nameConflict.id !== id) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /:id - delete category (check for usage first)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete category with existing transactions',
        transactionCount,
      });
    }

    const definitionCount = await prisma.budgetTransactionDefinition.count({
      where: { categoryId: id },
    });

    if (definitionCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete category referenced by budget definitions',
        definitionCount,
      });
    }

    await prisma.category.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export const categoryRoutes = router;
