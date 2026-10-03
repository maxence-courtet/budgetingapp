import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";

const router = Router();
router.use(authMiddleware);

router.get("/life-overview", async (req, res) => {
  const userId = req.userId!;
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    accounts,
    currentMonth,
    activeHabits,
    recentHabitLogs,
    recentFitness,
    goals,
    recentNotes,
  ] = await Promise.all([
    prisma.account.findMany({ where: { userId } }),
    prisma.month.findFirst({
      where: { userId, month: thisMonth, year: thisYear },
      include: { transactions: true },
    }),
    prisma.habit.findMany({ where: { userId, active: true } }),
    prisma.habitLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      include: { habit: true },
    }),
    prisma.fitnessEntry.findMany({
      where: { userId, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { milestones: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Finance summary
  const paidTxns = currentMonth?.transactions.filter((t) => t.status === "PAID") ?? [];
  const monthIncome = paidTxns.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const monthSpending = paidTxns.filter((t) => t.type === "SPENDING").reduce((s, t) => s + t.amount, 0);

  // Top spending categories this month
  const categoryTotals = new Map<string, number>();
  paidTxns.filter((t) => t.type === "SPENDING").forEach((t) => {
    categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amount);
  });
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([categoryId, total]) => ({ categoryId, total }));

  // Habit streaks (7-day window)
  const habitStats = activeHabits.map((habit) => {
    const logs = recentHabitLogs.filter((l) => l.habitId === habit.id && l.completed);
    return { habitId: habit.id, habitName: habit.name, completedDays: logs.length, totalDays: 7 };
  });
  const weeklyCompletionRate =
    habitStats.length > 0
      ? habitStats.reduce((s, h) => s + h.completedDays / h.totalDays, 0) / habitStats.length
      : 0;

  // Latest fitness by type
  const latestByType = new Map<string, (typeof recentFitness)[0]>();
  recentFitness.forEach((entry) => {
    if (!latestByType.has(entry.type)) latestByType.set(entry.type, entry);
  });

  // Goals summary
  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const atRiskGoals = activeGoals.filter((g) => {
    if (!g.deadline) return false;
    const daysLeft = (g.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const progress = g.targetValue ? (g.currentValue ?? 0) / g.targetValue : 0;
    return daysLeft < 30 && progress < 0.5;
  });

  res.json({
    generatedAt: now.toISOString(),
    finance: {
      currentMonthIncome: monthIncome,
      currentMonthSpending: monthSpending,
      currentMonthNet: monthIncome - monthSpending,
      topSpendingCategories: topCategories,
      accountCount: accounts.length,
    },
    habits: {
      activeHabitsCount: activeHabits.length,
      weeklyCompletionRate: Math.round(weeklyCompletionRate * 100),
      habitStats,
    },
    fitness: {
      latestMetrics: Object.fromEntries(
        Array.from(latestByType.entries()).map(([type, entry]) => [
          type,
          { value: entry.value, unit: entry.unit, date: entry.date },
        ])
      ),
      recentEntryCount: recentFitness.length,
    },
    goals: {
      totalActive: activeGoals.length,
      completedCount: goals.filter((g) => g.status === "COMPLETED").length,
      atRiskCount: atRiskGoals.length,
      atRisk: atRiskGoals.map((g) => ({ id: g.id, title: g.title, deadline: g.deadline })),
    },
    notes: {
      recentCount: recentNotes.length,
      recent: recentNotes.map((n) => ({ id: n.id, title: n.title, createdAt: n.createdAt })),
    },
  });
});

export default router;
