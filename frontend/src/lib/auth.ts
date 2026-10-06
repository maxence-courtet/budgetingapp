import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Google sign-in is offered only when its credentials are configured.
export const googleEnabled = Boolean(googleClientId && googleClientSecret);

function createAuth() {
  return betterAuth({
    baseURL: process.env.APP_BASE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    // Auth tables live in their own Postgres schema so the backend's `prisma db push` (which owns
    // `public`) never sees them.
    database: {
      db: new Kysely({
        dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }) }),
      }),
      type: "postgres",
      schemaName: "auth",
    },
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    socialProviders: googleEnabled
      ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret! } }
      : undefined,
    plugins: [
      // Issues the short-lived JWT the backend verifies against /api/auth/jwks.
      jwt({ jwt: { expirationTime: "15m" } }),
      nextCookies(),
    ],
  });
}

// Created on first use rather than at import, so `next build` (no secrets, no database) never initialises it.
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
