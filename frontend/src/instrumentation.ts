// Runs once when the server starts: creates or updates the auth tables.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { getMigrations } = await import("better-auth/db/migration");
  const { getAuth } = await import("@/lib/auth");
  const { runMigrations } = await getMigrations(getAuth().options);
  await runMigrations();
}
