import prisma from "./prisma";
import { todayUtc } from "./validate";
import { findPatterns } from "./patterns";

const DAY_MS = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const round = (n: number) => Math.round(n * 100) / 100;

/** Monday-to-Sunday range: the current week so far, or the previous full week. */
export function weekRange(which: "current" | "previous") {
  const today = todayUtc(); // local calendar day, as UTC midnight
  const monday = new Date(today.getTime() - ((today.getUTCDay() + 6) % 7) * DAY_MS);
  const start = which === "current" ? monday : new Date(monday.getTime() - 7 * DAY_MS);
  const end = which === "current" ? today : new Date(monday.getTime() - DAY_MS);
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const prevStart = new Date(start.getTime() - 7 * DAY_MS);
  const prevEnd = new Date(prevStart.getTime() + (days - 1) * DAY_MS); // same number of days, for a fair comparison
  return { start, end, days, prevStart, prevEnd };
}

const endOfDay = (d: Date) => new Date(d.getTime() + DAY_MS - 1);

/** Everything that happened in the week, with the previous week (same length) for comparison. */
export async function compileWeek(userId: string, which: "current" | "previous") {
  const { start, end, days, prevStart, prevEnd } = weekRange(which);
  const inWeek = { gte: start, lte: endOfDay(end) };
  const inPrev = { gte: prevStart, lte: endOfDay(prevEnd) };

  const [txns, prevTxns, habits, logs, prevLogs, fitness, goals, journal, patterns] = await Promise.all([
    prisma.transaction.findMany({ where: { userId, status: "PAID", date: inWeek }, include: { category: true } }),
    prisma.transaction.findMany({ where: { userId, status: "PAID", date: inPrev }, include: { category: true } }),
    prisma.habit.findMany({ where: { userId, active: true } }),
    prisma.habitLog.findMany({ where: { userId, completed: true, validatedAt: { not: null }, date: inWeek } }),
    prisma.habitLog.findMany({ where: { userId, completed: true, validatedAt: { not: null }, date: inPrev } }),
    prisma.fitnessEntry.findMany({ where: { userId, validatedAt: { not: null }, date: inWeek }, orderBy: { date: "asc" } }),
    prisma.goal.findMany({ where: { userId, status: "ACTIVE" }, include: { milestones: true } }),
    prisma.note.findMany({ where: { userId, noteType: "JOURNAL", entryDate: inWeek }, select: { entryDate: true } }),
    findPatterns(userId, 90),
  ]);

  const sum = (ts: typeof txns, type: string) => round(ts.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0));
  const byCategory = (ts: typeof txns) => {
    const m = new Map<string, number>();
    ts.filter((t) => t.type === "SPENDING").forEach((t) => m.set(t.category.name, (m.get(t.category.name) ?? 0) + t.amount));
    return m;
  };
  const cats = byCategory(txns);
  const prevCats = byCategory(prevTxns);

  const daily = habits.filter((h) => h.frequency === "DAILY");
  const doneOn = (ls: typeof logs, habitId: string) => new Set(ls.filter((l) => l.habitId === habitId).map((l) => iso(l.date)));
  const weekDays = Array.from({ length: days }, (_, i) => iso(new Date(start.getTime() + i * DAY_MS)));
  const perfectDays = daily.length
    ? weekDays.filter((d) => daily.every((h) => doneOn(logs, h.id).has(d))).length
    : 0;
  const rate = (ls: typeof logs) =>
    daily.length ? round(daily.reduce((s, h) => s + doneOn(ls, h.id).size, 0) / (daily.length * days)) : null;

  const fitnessByType = new Map<string, typeof fitness>();
  fitness.forEach((f) => fitnessByType.set(f.type, [...(fitnessByType.get(f.type) ?? []), f]));

  const soon = new Date(end.getTime() + 14 * DAY_MS);
  return {
    week: { start: iso(start), end: iso(end), days, complete: which === "previous" },
    money: {
      spending: sum(txns, "SPENDING"),
      spendingPreviousWeek: sum(prevTxns, "SPENDING"),
      income: sum(txns, "INCOME"),
      topCategories: [...cats.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount: round(amount), previousWeek: round(prevCats.get(name) ?? 0) })),
    },
    habits: {
      completionRate: rate(logs),
      completionRatePreviousWeek: rate(prevLogs),
      perfectDays,
      perHabit: habits.map((h) => ({
        name: h.name,
        frequency: h.frequency,
        done: doneOn(logs, h.id).size,
        doneInPreviousWeek: doneOn(prevLogs, h.id).size,
        outOf: h.frequency === "WEEKLY" ? 1 : days,
      })),
    },
    fitness: [...fitnessByType.entries()].map(([type, es]) => ({
      type,
      unit: es[0].unit,
      entries: es.length,
      first: es[0].value,
      last: es[es.length - 1].value,
    })),
    goals: goals.map((g) => ({
      title: g.title,
      progress: g.targetValue ? round((g.currentValue ?? 0) / g.targetValue) : null,
      current: g.currentValue,
      target: g.targetValue,
      unit: g.unit,
      deadline: g.deadline ? iso(g.deadline) : null,
      milestonesCompletedThisWeek: g.milestones.filter((m) => m.completedAt && m.completedAt >= start && m.completedAt <= endOfDay(end)).map((m) => m.title),
      milestonesDueSoon: g.milestones.filter((m) => !m.completedAt && m.dueDate && m.dueDate <= soon).map((m) => ({ title: m.title, due: iso(m.dueDate!) })),
    })),
    journalEntries: new Set(journal.map((n) => n.entryDate && iso(n.entryDate))).size, // distinct days
    patterns: patterns.patterns.slice(0, 3).map((p) => ({ title: p.title, detail: p.detail })),
  };
}

export type WeekSummary = Awaited<ReturnType<typeof compileWeek>>;
