import { Request, Response, NextFunction } from "express";
import prisma from "./prisma";

export const PLANS = ["PLUS", "PRO"] as const;
export type PaidPlan = (typeof PLANS)[number];
/** The plan in force: a paid plan, or EXPIRED once a trial or subscription has ended. */
export type PlanId = PaidPlan | "EXPIRED";

/** Length of the free trial every new account starts with (Plus features). */
export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 30;

/** Optional areas of the app (same ids as routes/me.ts MODULES). */
type ModuleId = "investments" | "habits" | "fitness" | "goals" | "notes" | "review";

export interface Entitlements {
  /** Using the app at all (money, settings data). Off once a trial or plan has ended. */
  access: boolean;
  /** Modules the plan includes. */
  modules: ModuleId[];
  /** Connecting an AI assistant over MCP. */
  mcp: boolean;
  /** Personal access tokens (hive_…) for assistants and automations. */
  apiTokens: boolean;
}

const ALL_MODULES: ModuleId[] = ["investments", "habits", "fitness", "goals", "notes", "review"];

/** What each plan unlocks; mirrors the pricing page (website/src/lib/plans.ts). */
export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  EXPIRED: { access: false, modules: [], mcp: false, apiTokens: false },
  PLUS: { access: true, modules: ALL_MODULES, mcp: true, apiTokens: false },
  PRO: { access: true, modules: ALL_MODULES, mcp: true, apiTokens: true },
};

const PLAN_NAMES: Record<PaidPlan, string> = { PLUS: "Plus", PRO: "Pro" };

/** Plan fields for a brand-new account: a free trial of Plus. */
export function trialPlan(now = new Date()) {
  return { plan: "PLUS", planExpiresAt: new Date(now.getTime() + TRIAL_DAYS * 86_400_000), planSource: "trial" };
}

/** The plan in force now: past its end date a plan (or trial) is EXPIRED. The data stays. */
export function effectivePlan(user: { plan: string; planExpiresAt: Date | null }, now = new Date()): PlanId {
  if (!(PLANS as readonly string[]).includes(user.plan)) return "EXPIRED";
  if (user.planExpiresAt && user.planExpiresAt <= now) return "EXPIRED";
  return user.plan as PaidPlan;
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
  constructor(message: string, public requiredPlan: PaidPlan) {
    super(message);
  }
}

export function sendPlanError(res: Response, err: PlanError) {
  return res.status(403).json({ error: err.message, code: "PLAN_REQUIRED", requiredPlan: err.requiredPlan });
}

const ENDED = "Your free trial or plan has ended. Choose a plan to keep using Hive; you can still export or delete your data in Settings.";

/** Route guard (after authMiddleware): the account must have an active trial or plan. */
export function requireAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entitlements } = await entitlementsOf(req.userId!);
      if (entitlements.access) return next();
      return sendPlanError(res, new PlanError(ENDED, "PLUS"));
    } catch (err) {
      next(err);
    }
  };
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
      const message = entitlements.access ? `${MODULE_LABELS[module]} isn't part of your plan.` : ENDED;
      return sendPlanError(res, new PlanError(message, "PLUS"));
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Sets a user's plan. Used by the admin endpoint today and by the payment provider's webhook later.
 * `expiresAt` null = no end date; a date in the past ends the plan.
 */
export async function setPlan(email: string, plan: PaidPlan, expiresAt: Date | null, source: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) return null;
  return prisma.user.update({ where: { id: user.id }, data: { plan, planExpiresAt: expiresAt, planSource: source } });
}

export function planSummary(user: { plan: string; planExpiresAt: Date | null; planSource: string | null }) {
  const plan = effectivePlan(user);
  return {
    plan,
    planExpiresAt: user.planExpiresAt,
    planSource: user.planSource,
    trial: user.planSource === "trial",
    trialDays: TRIAL_DAYS,
    entitlements: ENTITLEMENTS[plan],
  };
}

export { PLAN_NAMES };
