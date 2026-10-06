import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Google sign-in is offered only when its credentials are configured.
export const googleEnabled = Boolean(googleClientId && googleClientSecret);

// Personal access tokens for AI assistants start with this, which is how /api/mcp tells them apart
// from OAuth access tokens (JWTs).
export const API_KEY_PREFIX = "hive_";

/** The public URL AI assistants connect to. Also the OAuth resource their access tokens are bound to. */
export function mcpResourceUrl() {
  return `${(process.env.APP_BASE_URL ?? "").replace(/\/$/, "")}/api/mcp`;
}

// A redirect back to the user's own machine (http://localhost or 127.0.0.1) is how desktop and CLI assistants
// receive the OAuth code, which makes them native apps (RFC 8252). Older assistants register without saying
// so, and the provider would otherwise treat them as web apps and require https.
function isLoopbackHttp(uri: unknown) {
  try {
    const url = new URL(String(uri));
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

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
    // The OAuth provider must not be bypassed through the JWT plugin's own /token endpoint; the app's
    // /api/auth/token route (a separate Next route) issues the backend JWT instead.
    disabledPaths: ["/token"],
    emailAndPassword: { enabled: true, minPasswordLength: 10 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const body = ctx.body as { application_type?: string; redirect_uris?: unknown[] } | undefined;
        if (
          ctx.path === "/oauth2/register" &&
          body &&
          body.application_type === undefined &&
          Array.isArray(body.redirect_uris) &&
          body.redirect_uris.length > 0 &&
          body.redirect_uris.every(isLoopbackHttp)
        ) {
          return { context: { body: { ...body, application_type: "native" } } };
        }
      }),
    },
    socialProviders: googleEnabled
      ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret! } }
      : undefined,
    plugins: [
      // Signs the short-lived JWT the backend verifies against /api/auth/jwks, and the OAuth access tokens.
      jwt({ jwt: { expirationTime: "15m" } }),
      // OAuth 2.1 authorization server for AI assistants ("Sign in with Hive" from Claude, ChatGPT, ...).
      mcp({
        loginPage: "/login",
        consentPage: "/consent",
        resource: mcpResourceUrl(),
        // Client ID Metadata Documents are the current MCP standard; dynamic registration keeps
        // assistants that predate it working.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        // Short-lived, so disconnecting an assistant in Settings takes effect within minutes.
        accessTokenExpiresIn: 15 * 60,
      }),
      cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
      // Personal access tokens for assistants that take a token instead of signing in.
      apiKey({
        defaultPrefix: API_KEY_PREFIX,
        rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
      }),
      nextCookies(),
    ],
  });
}

// Created on first use rather than at import, so `next build` (no secrets, no database) never initialises it.
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return (instance ??= createAuth());
}
