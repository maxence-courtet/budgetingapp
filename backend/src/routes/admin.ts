import { Router, Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import prisma from "../services/prisma";
import { PLANS, PlanId, planSummary, setPlan } from "../services/plans";

const router = Router();

/**
 * Admin calls carry `Authorization: Bearer <ADMIN_TOKEN>`. Without ADMIN_TOKEN set, the admin API doesn't exist.
 * Meant for granting plans by hand until the payment provider calls setPlan itself.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(404).json({ error: "Not found" });
  const given = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: "Invalid admin token" });
  next();
}

router.use(requireAdmin);

/** GET /api/admin/plan?email=… → the user's plan. */
router.get("/plan", async (req, res) => {
  const email = String(req.query.email ?? "");
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) return res.status(404).json({ error: "No user with that email" });
  res.json({ email: user.email, storedPlan: user.plan, ...planSummary(user) });
});

/**
 * PUT /api/admin/plan { email, plan: FREE|PLUS|PRO, days?: number, expiresAt?: ISO date, source?: string }
 * days (from now) or expiresAt set the end date; neither = no end date.
 */
router.put("/plan", async (req, res) => {
  const { email, plan, days, expiresAt, source } = req.body ?? {};
  if (typeof email !== "string" || !email) return res.status(400).json({ error: "email is required" });
  if (!(PLANS as readonly string[]).includes(plan)) return res.status(400).json({ error: `plan must be one of ${PLANS.join(", ")}` });
  let end: Date | null = null;
  if (days !== undefined) {
    if (!Number.isFinite(days) || days <= 0) return res.status(400).json({ error: "days must be a positive number" });
    end = new Date(Date.now() + days * 86_400_000);
  } else if (expiresAt !== undefined) {
    end = new Date(expiresAt);
    if (Number.isNaN(end.getTime())) return res.status(400).json({ error: "expiresAt must be a date" });
  }
  const user = await setPlan(email, plan as PlanId, end, typeof source === "string" && source ? source : "manual");
  if (!user) return res.status(404).json({ error: "No user with that email (they must sign in once first)" });
  res.json({ email: user.email, storedPlan: user.plan, ...planSummary(user) });
});

export default router;
