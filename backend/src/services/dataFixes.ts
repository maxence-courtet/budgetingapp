import prisma from "./prisma";

// Accounts created before plans existed keep full access (Pro, no end date). GRANDFATHER_BEFORE moves the cut-off.
const GRANDFATHER_BEFORE = process.env.GRANDFATHER_BEFORE || "2026-10-07T15:30:00Z";

/**
 * Idempotent clean-ups of data written by older versions, run once at startup.
 * - Account types: older rows used "CHECKING" / "CREDIT_CARD"; the app stores "checking" / "credit card".
 * - Plans: users from before plans existed (never assigned one) get Pro without an end date.
 */
export async function runDataFixes() {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Account" SET "type" = lower(replace("type", '_', ' ')) WHERE "type" <> lower(replace("type", '_', ' '))`
    );
    const grandfathered = await prisma.user.updateMany({
      where: { planSource: null, plan: "FREE", createdAt: { lt: new Date(GRANDFATHER_BEFORE) } },
      data: { plan: "PRO", planExpiresAt: null, planSource: "grandfathered" },
    });
    if (grandfathered.count) console.log(`Plans: ${grandfathered.count} existing user(s) kept full access (Pro)`);
  } catch (err) {
    console.error("Data fixes failed (continuing):", err);
  }
}
