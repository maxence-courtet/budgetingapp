import type { ModuleId } from "@/lib/nav";

export type PlanId = "FREE" | "PLUS" | "PRO";

/** What the user's plan unlocks (sent by GET /api/me; defined in backend/src/services/plans.ts). */
export interface Entitlements {
  modules: ModuleId[];
  budgetTemplates: number | null;
  mcp: boolean;
  apiTokens: boolean;
}

export const PLAN_NAMES: Record<PlanId, string> = { FREE: "Free", PLUS: "Plus", PRO: "Pro" };

/** Until /api/me answers, nothing is shown as locked. */
export const UNKNOWN_ENTITLEMENTS: Entitlements = {
  modules: ["investments", "habits", "fitness", "goals", "notes", "review"],
  budgetTemplates: null,
  mcp: true,
  apiTokens: true,
};

/** The cheapest plan that includes a module (every module is in Plus). */
export const MODULE_PLAN: PlanId = "PLUS";

/** Fallback for "Upgrade" when the backend doesn't send PRICING_URL. */
export const DEFAULT_UPGRADE_URL = "https://website-qa-qa.up.railway.app/pricing/";
