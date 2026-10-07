import { Request, Response, NextFunction } from "express";
import prisma from "./prisma";

export const PLANS = ["FREE", "PLUS", "PRO"] as const;
export type PlanId = (typeof PLANS)[number];

/** Optional areas of the app (same ids as routes/me.ts MODULES). */
type ModuleId = "investments" | "habits" | "fitness" | "goals" | "notes" | "review";

export interface Entitlements {
  /** Modules the plan includes; money (accounts, transactions, reports) is always included. */
  modules: ModuleId[];
  /** Most budget templates the user can have; null = unlimited. */
  budgetTemplates: number | null;
  /** Connecting an AI assistant over MCP. */
  mcp: boolean;
  /** Personal access tokens (hive_…) for assistants and automations. */
  apiTokens: boolean;
}

const ALL_MODULES: ModuleId[] = ["investments", "habits", "fitness", "goals", "notes", "review"];

/** What each plan unlocks; mirrors the pricing page (website/src/lib/plans.ts). */
export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  FREE: { modules: [], budgetTemplates: 1, mcp: false, apiTokens: false },
  PLUS: { modules: ALL_MODULES, budgetTemplates: null, mcp: true, apiTokens: false },
  PRO: { modules: ALL_MODULES, budgetTemplates: null, mcp: true, apiTokens: true },
};

const PLAN_NAMES: Record<PlanId, string> = { FREE: "Free", PLUS: "Plus", PRO: "Pro" };

/** The plan in force now: a paid plan whose end date has passed is Free (the data stays). */
export function effectivePlan(user: { plan: string; planExpiresAt: Date | null }, now = new Date()): PlanId {
  const plan = (PLANS as readonly string[]).includes(user.plan) ? (user.plan as PlanId) : "FREE";
  if (plan !== "FREE" && user.planExpiresAt && user.planExpiresAt <= now) return "FREE";
  return plan;
}

export async function planOf(userId: string): Promise<PlanId> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true, planExpiresAt: true } });
  return effectivePlan(user);
}

export async function entitlementsOf(userId: string) {
  const plan = await planOf(userId);
  return { plan, entitlements: ENTITLEMENTS[plan] };
}

/** Thrown when the user's plan doesn't include something; answered with 403 and code PLAN_REQUIRED. */
export class PlanError extends Error {
  status = 403;
  constructor(message: string, public requiredPlan: PlanId) {
    super(message);
  }
}

export function sendPlanError(res: Response, err: PlanError) {
  return res.status(403).json({ error: err.message, code: "PLAN_REQUIRED", requiredPlan: err.requiredPlan });
}

/** The cheapest plan that passes `test`. */
export function cheapestPlanWith(test: (e: Entitlements) => boolean): PlanId {
  return PLANS.find((p) => test(ENTITLEMENTS[p])) ?? "PRO";
}

const MODULE_LABELS: Record<ModuleId, string> = {
  investments: "Investments",
  habits: "Habits",
  fitness: "Fitness",
  goals: "Goals",
  notes: "Notes and journal",
  review: "The weekly review",
};

/** Route guard (after authMiddleware): the user's plan must include `module`. */
export function requireModule(module: ModuleId) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entitlements } = await entitlementsOf(req.userId!);
      if (entitlements.modules.includes(module)) return next();
      const required = cheapestPlanWith((e) => e.modules.includes(module));
      return sendPlanError(res, new PlanError(`${MODULE_LABELS[module]} is part of Hive ${PLAN_NAMES[required]}.`, required));
    } catch (err) {
      next(err);
    }
  };
}

/** Throws a PlanError when the user already has as many budget templates as their plan allows. */
export async function assertCanAddBudgetTemplate(userId: string) {
  const { entitlements } = await entitlementsOf(userId);
  if (entitlements.budgetTemplates === null) return;
  const count = await prisma.budgetTemplate.count({ where: { userId } });
  if (count >= entitlements.budgetTemplates) {
    const required = cheapestPlanWith((e) => e.budgetTemplates === null);
    throw new PlanError(
      `Your plan includes ${entitlements.budgetTemplates} budget template${entitlements.budgetTemplates === 1 ? "" : "s"}. Upgrade to Hive ${PLAN_NAMES[required]} for unlimited templates.`,
      required
    );
  }
}

/**
 * Sets a user's plan. Used by the admin endpoint today and by the payment provider's webhook later.
 * `expiresAt` null = no end date.
 */
export async function setPlan(email: string, plan: PlanId, expiresAt: Date | null, source: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) return null;
  return prisma.user.update({
    where: { id: user.id },
    data: { plan, planExpiresAt: plan === "FREE" ? null : expiresAt, planSource: source },
  });
}

export function planSummary(user: { plan: string; planExpiresAt: Date | null; planSource: string | null }) {
  const plan = effectivePlan(user);
  return {
    plan,
    planExpiresAt: plan === "FREE" ? null : user.planExpiresAt,
    planSource: user.planSource,
    /** A paid plan that ran out (shown in Settings so the user knows why things locked). */
    expiredPlan: plan === "FREE" && user.plan !== "FREE" ? (user.plan as PlanId) : null,
    entitlements: ENTITLEMENTS[plan],
  };
}
