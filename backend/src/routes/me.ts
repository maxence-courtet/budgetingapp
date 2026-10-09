import { Router, Request, Response, NextFunction } from "express";
import type { User } from "@prisma/client";
import prisma from "../services/prisma";
import { planSummary } from "../services/plans";

/** Optional areas of the app. Money (accounts, transactions, budgets, reports) is always on. */
export const MODULES = ["investments", "habits", "fitness", "goals", "notes", "review"] as const;

const router = Router();

function preferences(user: User) {
  const websiteUrl = (process.env.WEBSITE_URL || "").replace(/\/$/, "") || null;
  return {
    ...planSummary(user),
    // Where "Upgrade" points until payments live in the app, and the public site (legal pages, guides).
    upgradeUrl: process.env.PRICING_URL || (websiteUrl ? `${websiteUrl}/pricing/` : null),
    websiteUrl,
    email: user.email,
    name: user.name,
    modules: user.modules.filter((m) => (MODULES as readonly string[]).includes(m)),
    onboarded: user.onboardedAt !== null,
    termsAcceptedAt: user.termsAcceptedAt,
    termsVersion: user.termsVersion,
    healthConsentAt: user.healthConsentAt,
  };
}

router.get("/", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json(preferences(user));
});

/**
 * Body: { modules?: string[], onboarded?: true, acceptTerms?: string (version), healthConsent?: boolean }.
 * Withdrawing health consent deletes the fitness data it covered.
 */
router.patch("/", async (req, res) => {
  const { modules, onboarded, acceptTerms, healthConsent } = req.body ?? {};
  const data: { modules?: string[]; onboardedAt?: Date; termsAcceptedAt?: Date; termsVersion?: string; healthConsentAt?: Date | null } = {};
  if (modules !== undefined) {
    if (!Array.isArray(modules) || modules.some((m) => !(MODULES as readonly string[]).includes(m))) {
      return res.status(400).json({ error: `modules must be a list drawn from: ${MODULES.join(", ")}` });
    }
    data.modules = [...new Set(modules as string[])];
  }
  if (onboarded === true) data.onboardedAt = new Date();
  if (acceptTerms !== undefined) {
    if (typeof acceptTerms !== "string" || !acceptTerms || acceptTerms.length > 40) {
      return res.status(400).json({ error: "acceptTerms must be the version of the terms accepted" });
    }
    data.termsAcceptedAt = new Date();
    data.termsVersion = acceptTerms;
  }
  if (healthConsent === true) data.healthConsentAt = new Date();
  if (healthConsent === false) {
    data.healthConsentAt = null;
    await deleteFitnessData(req.userId!);
  }
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(preferences(user));
});

async function deleteFitnessData(userId: string) {
  await prisma.$transaction([
    prisma.fitnessPlanDay.deleteMany({ where: { userId } }),
    prisma.fitnessPlan.deleteMany({ where: { userId } }),
    prisma.fitnessEntry.deleteMany({ where: { userId } }),
  ]);
}

/** Route guard for health data (fitness): the user must have given explicit consent. */
export async function requireHealthConsent(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { healthConsentAt: true } });
    if (user.healthConsentAt) return next();
    res.status(403).json({
      error: "Fitness stores health data, so it needs your consent first. You can give it on the Fitness page.",
      code: "CONSENT_REQUIRED",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/me/export: everything Hive stores about the user, as JSON (right of access and data portability,
 * GDPR art. 15 and 20 / nFADP art. 25 and 28). Sign-in data held by the auth service is added by the frontend.
 */
router.get("/export", async (req, res) => {
  const userId = req.userId!;
  const where = { where: { userId } };
  const [user, accounts, categories, budgetTemplates, budgetLines, months, transactions, trades, habits, habitLogs, fitnessEntries, fitnessPlans, fitnessPlanDays, goals, goalMilestones, notes, netWorthSnapshots, aiUsage] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.account.findMany(where),
      prisma.category.findMany(where),
      prisma.budgetTemplate.findMany(where),
      prisma.budgetTransactionDefinition.findMany(where),
      prisma.month.findMany(where),
      prisma.transaction.findMany({ ...where, orderBy: { date: "asc" } }),
      prisma.investmentTrade.findMany(where),
      prisma.habit.findMany(where),
      prisma.habitLog.findMany(where),
      prisma.fitnessEntry.findMany(where),
      prisma.fitnessPlan.findMany(where),
      prisma.fitnessPlanDay.findMany(where),
      prisma.goal.findMany(where),
      prisma.goalMilestone.findMany(where),
      prisma.note.findMany(where),
      prisma.netWorthSnapshot.findMany(where),
      prisma.aiUsage.findMany(where),
    ]);
  res.json({
    exportedAt: new Date().toISOString(),
    profile: user,
    money: { accounts, categories, budgetTemplates, budgetLines, months, transactions },
    investments: { trades },
    habits: { habits, logs: habitLogs },
    fitness: { entries: fitnessEntries, plans: fitnessPlans, planDays: fitnessPlanDays },
    goals: { goals, milestones: goalMilestones },
    notes,
    netWorthSnapshots,
    aiUsage,
  });
});

/**
 * DELETE /api/me: erases the user and everything they stored (right to erasure, GDPR art. 17 / nFADP art. 32).
 * The frontend then deletes the sign-in account.
 */
router.delete("/", async (req, res) => {
  const userId = req.userId!;
  const where = { where: { userId } };
  // Children before parents, so no foreign key blocks a delete.
  await prisma.$transaction([
    prisma.habitLog.deleteMany(where),
    prisma.habit.deleteMany(where),
    prisma.fitnessPlanDay.deleteMany(where),
    prisma.fitnessPlan.deleteMany(where),
    prisma.fitnessEntry.deleteMany(where),
    prisma.goalMilestone.deleteMany(where),
    prisma.goal.deleteMany(where),
    prisma.note.deleteMany(where),
    prisma.netWorthSnapshot.deleteMany(where),
    prisma.aiUsage.deleteMany(where),
    prisma.investmentTrade.deleteMany(where),
    prisma.transaction.deleteMany(where),
    prisma.budgetTransactionDefinition.deleteMany(where),
    prisma.month.deleteMany(where),
    prisma.budgetTemplate.deleteMany(where),
    prisma.category.deleteMany(where),
    prisma.account.deleteMany(where),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  res.status(204).end();
});

export default router;
