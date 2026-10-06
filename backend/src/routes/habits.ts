import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { date as parseDate, text, oneOf } from "../services/validate";

const router = Router();
router.use(authMiddleware);

// List habits
router.get("/", async (req, res) => {
  const userId = req.userId!;
  const habits = await prisma.habit.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  res.json(habits);
});

// Create habit
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const name = text(req.body.name, "name", { max: 80 })!;
  const { description } = req.body;
  const frequency = oneOf(req.body.frequency, "frequency", ["DAILY", "WEEKLY"] as const, { optional: true }) ?? "DAILY";

  const habit = await prisma.habit.create({
    data: { userId, name, description: description ?? null, frequency },
  });
  res.status(201).json(habit);
});

// Update habit
router.put("/:id", async (req, res) => {
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const { name, description, frequency, active } = req.body;
  const updated = await prisma.habit.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name: text(name, "name", { max: 80 })! } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(frequency !== undefined ? { frequency: oneOf(frequency, "frequency", ["DAILY", "WEEKLY"] as const)! } : {}),
      // pausedAt marks when tracking stopped, so pausing never rewrites past perfect days
      ...(active !== undefined ? { active: Boolean(active), pausedAt: Boolean(active) ? null : habit.pausedAt ?? new Date() } : {}),
    },
  });
  res.json(updated);
});

// Delete habit
router.delete("/:id", async (req, res) => {
  const userId = req.userId!;
  const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });
  await prisma.habit.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// List logs across all habits (one call for streaks and stats)
router.get("/logs", async (req, res) => {
  const userId = req.userId!;
  const { dateFrom, dateTo } = req.query;
  const logs = await prisma.habitLog.findMany({
    where: {
      userId,
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(String(dateFrom)) } : {}),
              ...(dateTo ? { lte: new Date(String(dateTo)) } : {}),
            },
          }
        : {}),
    },
    select: { id: true, habitId: true, date: true, completed: true, source: true, validatedAt: true },
    orderBy: { date: "asc" },
  });
  res.json(logs);
});

// List logs for a habit
router.get("/:id/logs", async (req, res) => {
  const userId = req.userId!;
  const { dateFrom, dateTo } = req.query;

  const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const logs = await prisma.habitLog.findMany({
    where: {
      habitId: req.params.id,
      userId,
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(String(dateFrom)) } : {}),
              ...(dateTo ? { lte: new Date(String(dateTo)) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });
  res.json(logs);
});

// Log a habit completion
router.post("/:id/logs", async (req, res) => {
  const userId = req.userId!;
  const { date, completed, note, source } = req.body;
  if (!date) return res.status(400).json({ error: "date is required" });

  const habit = await prisma.habit.findFirst({ where: { id: req.params.id, userId } });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const logDate = parseDate(date, "date")!;
  const isMcp = source === "MCP";
  // Every write records who made it: AI (MCP) writes always wait for approval, even when the
  // day already had a manual log; a manual write (e.g. clicking a pending square) approves it.
  const provenance = { source: isMcp ? "MCP" : "MANUAL", validatedAt: isMcp ? null : new Date() };

  // The AI can propose, never overwrite: a day the user already logged themselves stays theirs.
  if (isMcp) {
    const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: req.params.id, date: logDate } } });
    if (existing && existing.source === "MANUAL" && existing.validatedAt) {
      if (existing.completed === (completed ?? true)) return res.status(200).json(existing);
      return res.status(409).json({ error: "The user already logged this day; AI entries can't change it" });
    }
  }

  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: req.params.id, date: logDate } },
    create: {
      habitId: req.params.id,
      userId,
      date: logDate,
      completed: completed ?? true,
      note: note ?? null,
      source: isMcp ? "MCP" : "MANUAL",
      validatedAt: isMcp ? null : new Date(),
    },
    update: {
      completed: completed ?? true,
      ...(note !== undefined ? { note: note ?? null } : {}),
      ...provenance,
    },
  });
  res.status(201).json(log);
});

// Get all pending (MCP-created, unvalidated) logs
router.get("/pending/all", async (req, res) => {
  const userId = req.userId!;
  const logs = await prisma.habitLog.findMany({
    where: { userId, source: "MCP", validatedAt: null },
    include: { habit: true },
    orderBy: { date: "desc" },
  });
  res.json(logs);
});

// Validate a log
router.patch("/logs/:logId/validate", async (req, res) => {
  const userId = req.userId!;
  const log = await prisma.habitLog.findFirst({ where: { id: req.params.logId, userId } });
  if (!log) return res.status(404).json({ error: "Log not found" });

  const updated = await prisma.habitLog.update({
    where: { id: req.params.logId },
    data: { validatedAt: new Date() },
  });
  res.json(updated);
});

// Reject (delete) a pending log
router.delete("/logs/:logId", async (req, res) => {
  const userId = req.userId!;
  const log = await prisma.habitLog.findFirst({ where: { id: req.params.logId, userId } });
  if (!log) return res.status(404).json({ error: "Log not found" });
  await prisma.habitLog.delete({ where: { id: req.params.logId } });
  res.status(204).send();
});

export default router;
