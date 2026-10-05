import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { num, date as parseDate, text } from "../services/validate";

/** Unit used when none is given, for the built-in metrics. */
const DEFAULT_UNITS: Record<string, string> = { WEIGHT: "kg", BODY_FAT: "%", STEPS: "steps", WORKOUT_DURATION: "min" };

const router = Router();
router.use(authMiddleware);

// List entries (filterable)
router.get("/", async (req, res) => {
  const userId = req.userId!;
  const { type, dateFrom, dateTo, source, limit } = req.query;

  const entries = await prisma.fitnessEntry.findMany({
    where: {
      userId,
      ...(type ? { type: String(type) } : {}),
      ...(source ? { source: String(source) } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: parseDate(dateFrom, "dateFrom")! } : {}),
              ...(dateTo ? { lte: parseDate(dateTo, "dateTo")! } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: limit ? Math.min(1000, Math.max(1, Math.trunc(num(limit, "limit")!))) : 200,
  });
  res.json(entries);
});

// Create entry
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const { note, source } = req.body;
  const type = text(req.body.type, "type", { max: 60 })!;
  const value = num(req.body.value, "value", { min: 0 })!;
  const unit = text(req.body.unit, "unit", { optional: true, max: 20 }) ?? DEFAULT_UNITS[type.toUpperCase()];
  if (!unit) return res.status(400).json({ error: "unit is required for a custom metric" });
  const date = parseDate(req.body.date, "date")!;

  const isMcp = source === "MCP";
  const entry = await prisma.fitnessEntry.create({
    data: {
      userId,
      type,
      value,
      unit,
      note: note ?? null,
      date,
      source: isMcp ? "MCP" : "MANUAL",
      validatedAt: isMcp ? null : new Date(),
    },
  });
  res.status(201).json(entry);
});

// Update entry
router.put("/:id", async (req, res) => {
  const userId = req.userId!;
  const entry = await prisma.fitnessEntry.findFirst({ where: { id: req.params.id, userId } });
  if (!entry) return res.status(404).json({ error: "Entry not found" });

  const b = req.body;
  const updated = await prisma.fitnessEntry.update({
    where: { id: req.params.id },
    data: {
      ...(b.type !== undefined ? { type: text(b.type, "type", { max: 60 })! } : {}),
      ...(b.value !== undefined ? { value: num(b.value, "value", { min: 0 })! } : {}),
      ...(b.unit !== undefined ? { unit: text(b.unit, "unit", { max: 20 })! } : {}),
      ...(b.note !== undefined ? { note: b.note || null } : {}),
      ...(b.date !== undefined ? { date: parseDate(b.date, "date")! } : {}),
    },
  });
  res.json(updated);
});

// Delete entry
router.delete("/:id", async (req, res) => {
  const userId = req.userId!;
  const entry = await prisma.fitnessEntry.findFirst({ where: { id: req.params.id, userId } });
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  await prisma.fitnessEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Pending MCP entries
router.get("/pending/all", async (req, res) => {
  const userId = req.userId!;
  const entries = await prisma.fitnessEntry.findMany({
    where: { userId, source: "MCP", validatedAt: null },
    orderBy: { date: "desc" },
  });
  res.json(entries);
});

// Validate entry
router.patch("/:id/validate", async (req, res) => {
  const userId = req.userId!;
  const entry = await prisma.fitnessEntry.findFirst({ where: { id: req.params.id, userId } });
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  const updated = await prisma.fitnessEntry.update({
    where: { id: req.params.id },
    data: { validatedAt: new Date() },
  });
  res.json(updated);
});

// Fitness plans
router.get("/plans", async (req, res) => {
  const userId = req.userId!;
  const plans = await prisma.fitnessPlan.findMany({
    where: { userId },
    include: { goal: true, days: { orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }] } },
    orderBy: { createdAt: "desc" },
  });
  res.json(plans);
});

router.get("/plans/:id", async (req, res) => {
  const userId = req.userId!;
  const plan = await prisma.fitnessPlan.findFirst({
    where: { id: req.params.id, userId },
    include: { goal: true, days: { include: { habit: true }, orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }] } },
  });
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  res.json(plan);
});

router.patch("/plans/:id/status", async (req, res) => {
  const userId = req.userId!;
  const plan = await prisma.fitnessPlan.findFirst({ where: { id: req.params.id, userId } });
  if (!plan) return res.status(404).json({ error: "Plan not found" });
  const { status } = req.body;
  const updated = await prisma.fitnessPlan.update({ where: { id: req.params.id }, data: { status } });
  res.json(updated);
});

export default router;
