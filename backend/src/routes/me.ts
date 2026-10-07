import { Router } from "express";
import prisma from "../services/prisma";
import { planSummary } from "../services/plans";

/** Optional areas of the app. Money (accounts, transactions, budgets, reports) is always on. */
export const MODULES = ["investments", "habits", "fitness", "goals", "notes", "review"] as const;

const router = Router();

function preferences(user: {
  email: string;
  name: string;
  modules: string[];
  onboardedAt: Date | null;
  plan: string;
  planExpiresAt: Date | null;
  planSource: string | null;
}) {
  return {
    ...planSummary(user),
    // Where "Upgrade" points until payments live in the app.
    upgradeUrl: process.env.PRICING_URL || null,
    email: user.email,
    name: user.name,
    modules: user.modules.filter((m) => (MODULES as readonly string[]).includes(m)),
    onboarded: user.onboardedAt !== null,
  };
}

router.get("/", async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json(preferences(user));
});

/** Body: { modules?: string[], onboarded?: true }. Unknown module names are rejected. */
router.patch("/", async (req, res) => {
  const { modules, onboarded } = req.body ?? {};
  const data: { modules?: string[]; onboardedAt?: Date } = {};
  if (modules !== undefined) {
    if (!Array.isArray(modules) || modules.some((m) => !(MODULES as readonly string[]).includes(m))) {
      return res.status(400).json({ error: `modules must be a list drawn from: ${MODULES.join(", ")}` });
    }
    data.modules = [...new Set(modules as string[])];
  }
  if (onboarded === true) data.onboardedAt = new Date();
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(preferences(user));
});

export default router;
