import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { num, date as parseDate, oneOf, text, GOAL_TYPES, GOAL_STATUSES } from "../services/validate";

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
    include: { fitnessPlan: { include: { days: true } }, milestones: { orderBy: { dueDate: "asc" } } },
  });
  if (!goal) return res.status(404).json({ error: "Goal not found" });
  res.json(goal);
});

// Create goal
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const { description, unit, linkedType, linkedId } = req.body;
  const title = text(req.body.title, "title", { max: 120 })!;
  const type = oneOf(req.body.type, "type", GOAL_TYPES)!;
  const targetValue = num(req.body.targetValue, "targetValue", { optional: true });
  const startValue = num(req.body.startValue, "startValue", { optional: true });
  const deadline = parseDate(req.body.deadline, "deadline", { optional: true });

  const goal = await prisma.goal.create({
    data: {
      userId,
      title,
      description: description ?? null,
      type,
      targetValue,
      startValue,
      ...(startValue !== null ? { currentValue: startValue } : {}),
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

  const { description, unit, linkedType, linkedId } = req.body;
  const b = req.body;
  // Turning a goal into "lower is better" starts its progress at the starting value.
  const newStart = b.startValue !== undefined ? num(b.startValue, "startValue", { optional: true }) : undefined;
  const startProgress = newStart != null && goal.startValue == null && !goal.currentValue ? { currentValue: newStart } : {};
  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: {
      ...(b.title !== undefined ? { title: text(b.title, "title", { max: 120 })! } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(b.type !== undefined ? { type: oneOf(b.type, "type", GOAL_TYPES)! } : {}),
      ...(b.targetValue !== undefined ? { targetValue: num(b.targetValue, "targetValue", { optional: true }) } : {}),
      ...(newStart !== undefined ? { startValue: newStart } : {}),
      ...startProgress,
      ...(unit !== undefined ? { unit } : {}),
      ...(b.deadline !== undefined ? { deadline: parseDate(b.deadline, "deadline", { optional: true }) } : {}),
      ...(b.status !== undefined ? { status: oneOf(b.status, "status", GOAL_STATUSES)! } : {}),
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

  // Rounded to 4 decimals so repeated +/- steps don't accumulate float noise (49.99999999999999).
  const currentValue = Math.round(num(req.body.currentValue, "currentValue", { min: 0 })! * 1e4) / 1e4;

  const updated = await prisma.goal.update({
    where: { id: req.params.id },
    data: { currentValue },
    include: { milestones: true },
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

  const title = text(req.body.title, "title", { max: 120 })!;
  const targetValue = num(req.body.targetValue, "targetValue", { optional: true });
  const dueDate = parseDate(req.body.dueDate, "dueDate", { optional: true });

  const milestone = await prisma.goalMilestone.create({
    data: {
      goalId: req.params.id,
      userId,
      title,
      targetValue,
      dueDate,
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
