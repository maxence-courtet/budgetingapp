import prisma from "./prisma";
import { trialPlan } from "./plans";

// Accounts created before plans existed keep full access (Pro, no end date). GRANDFATHER_BEFORE moves the cut-off.
const GRANDFATHER_BEFORE = process.env.GRANDFATHER_BEFORE || "2026-10-07T15:30:00Z";

/**
 * Idempotent clean-ups of data written by older versions, run once at startup.
 * - Plans: accounts from the Free-plan era (plan FREE) get the free trial, counted from when they signed up.
 * - Account types: older rows used "CHECKING" / "CREDIT_CARD"; the app stores "checking" / "credit card".
 * - Plans: users from before plans existed (never assigned one) get Pro without an end date.
 */
export async function runDataFixes() {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Account" SET "type" = lower(replace("type", '_', ' ')) WHERE "type" <> lower(replace("type", '_', ' '))`
    );
    const grandfathered = await prisma.user.updateMany({
      where: { planSource: null, plan: { in: ["FREE", "PLUS"] }, createdAt: { lt: new Date(GRANDFATHER_BEFORE) } },
      data: { plan: "PRO", planExpiresAt: null, planSource: "grandfathered" },
    });
    if (grandfathered.count) console.log(`Plans: ${grandfathered.count} existing user(s) kept full access (Pro)`);
    const legacyFree = await prisma.user.findMany({ where: { plan: "FREE" }, select: { id: true, createdAt: true } });
    for (const u of legacyFree) await prisma.user.update({ where: { id: u.id }, data: trialPlan(u.createdAt) });
    if (legacyFree.length) console.log(`Plans: ${legacyFree.length} Free account(s) moved to the free trial`);
  } catch (err) {
    console.error("Data fixes failed (continuing):", err);
  }
}
