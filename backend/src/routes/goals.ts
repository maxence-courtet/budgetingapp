import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";

const router = Router();
router.use(authMiddleware);

// List goals
router.get("/", async (req, res) => {
  const userId = req.userId!;
  const { status, type } = req.query;

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      ...(status ? { status: String(status) } : {}),
      ...(type ? { type: String(type) } : {}),
    },
    include: { fitnessPlan: true, milestones: { orderBy: { dueDate: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(goals);
});

// Get single goal
router.get("/:id", async (req, res) => {
  const userId = req.userId!;
  const goal = await prisma.goal.findFirst({
    where: { id: req.params.id, userId },
    include: { fitnessPlan: { include: { days: true } }, milestones: true },
  });
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  res.json(goal);
});

// Create goal
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const { title, description, type, targetValue, unit, deadline, linkedType, linkedId } = req.body;
  if (!title || !type) return res.status(400).json({ error: "title and type are required" });

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description: description ?? null,
      type,
      targetValue: targetValue !== undefined ? Number(targetValue) : null,
      unit: unit ?? null,
      deadline: deadline ? new Date(deadline) : null,
      linkedType: linkedType ?? null,
      linkedId: linkedId ?? null,
    },
    include: { milestones: true },
  });
  res.status(201).json(goal);
});

// Update goal
router.put("/:id", async (req, res) => {
  const userId = req.userId!;
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId } });
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const { title, description, targetValue, unit, deadline, status, linkedType, linkedId } = req.body;
  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(targetValue !== undefined ? { targetValue: Number(targetValue) } : {}),
      ...(unit !== undefined ? { unit } : {}),
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
      ...(status ? { status } : {}),
      ...(linkedType !== undefined ? { linkedType } : {}),
      ...(linkedId !== undefined ? { linkedId } : {}),
    },
    include: { milestones: true },
  });
  res.json(updated);
});

// Update progress
router.patch("/:id/progress", async (req, res) => {
  const userId = req.userId!;
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId } });
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const { currentValue } = req.body;
  if (currentValue === undefined) return res.status(400).json({ error: "currentValue is required" });

  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: { currentValue: Number(currentValue) },
  });
  res.json(updated);
});

// Delete goal
router.delete("/:id", async (req, res) => {
  const userId = req.userId!;
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId } });
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  await prisma.goal.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Milestones
router.post("/:id/milestones", async (req, res) => {
  const userId = req.userId!;
  const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId } });
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const { title, targetValue, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: "title is required" });

  const milestone = await prisma.goalMilestone.create({
    data: {
      goalId: req.params.id,
      userId,
      title,
      targetValue: targetValue !== undefined ? Number(targetValue) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  res.status(201).json(milestone);
});

router.patch("/milestones/:milestoneId/complete", async (req, res) => {
  const userId = req.userId!;
  const m = await prisma.goalMilestone.findFirst({ where: { id: req.params.milestoneId, userId } });
  if (!m) return res.status(404).json({ error: "Milestone not found" });
  const updated = await prisma.goalMilestone.update({
    where: { id: req.params.milestoneId },
    data: { completedAt: m.completedAt ? null : new Date() },
  });
  res.json(updated);
});

router.delete("/milestones/:milestoneId", async (req, res) => {
  const userId = req.userId!;
  const m = await prisma.goalMilestone.findFirst({ where: { id: req.params.milestoneId, userId } });
  if (!m) return res.status(404).json({ error: "Milestone not found" });
  await prisma.goalMilestone.delete({ where: { id: req.params.milestoneId } });
  res.status(204).send();
});

export default router;
