import type { ModuleId } from "@/lib/nav";

/** The plan in force (EXPIRED once a trial or plan has ended). Defined in backend/src/services/plans.ts. */
export type PlanId = "PLUS" | "PRO" | "EXPIRED";

/** What the user's plan unlocks (sent by GET /api/me). */
export interface Entitlements {
  access: boolean;
  modules: ModuleId[];
  mcp: boolean;
  apiTokens: boolean;
}

export const PLAN_NAMES: Record<PlanId, string> = { PLUS: "Plus", PRO: "Pro", EXPIRED: "No plan" };

/** Until /api/me answers, nothing is shown as locked. */
export const UNKNOWN_ENTITLEMENTS: Entitlements = {
  access: true,
  modules: ["investments", "habits", "fitness", "goals", "notes", "review"],
  mcp: true,
  apiTokens: true,
};

/** The cheapest plan that includes a module. */
export const MODULE_PLAN: PlanId = "PLUS";

/** Version of the terms and privacy policy shown at sign-up; recorded on the account when accepted. */
export const TERMS_VERSION = "2026-10-09";

/** Fallback for the public website when the backend doesn't send WEBSITE_URL. */
export const DEFAULT_WEBSITE_URL = "https://website-qa-qa.up.railway.app";
