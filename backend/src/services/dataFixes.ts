import prisma from "./prisma";

/**
 * Idempotent clean-ups of data written by older versions, run once at startup.
 * - Account types: older rows used "CHECKING" / "CREDIT_CARD"; the app stores "checking" / "credit card".
 */
export async function runDataFixes() {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Account" SET "type" = lower(replace("type", '_', ' ')) WHERE "type" <> lower(replace("type", '_', ' '))`
    );
  } catch (err) {
    console.error("Data fixes failed (continuing):", err);
  }
}
