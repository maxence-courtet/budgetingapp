# Hive architecture

How Hive is built, what it depends on, and how it grows. For running it locally see [DEVELOPMENT.md](../DEVELOPMENT.md); for data protection see [COMPLIANCE.md](COMPLIANCE.md).

## The pieces

```
                        ┌─────────────────────────── Railway project ───────────────────────────┐
  Browser / phone ────► │  website        static Next.js export served by nginx (marketing,     │
                        │                 pricing, /connect guide, legal pages)                  │
                        │                                                                        │
  Browser / phone ────► │  frontend       Next.js 16 app (App Router, React 19, Tailwind 4)      │
  AI assistants   ────► │   ├─ Better Auth  sign-in, sessions, JWT signing (JWKS), OAuth 2.1      │
   (Claude, ChatGPT,    │   │               server for assistants, personal access tokens         │
    any MCP client)     │   ├─ /api/mcp     hosted MCP server (Streamable HTTP, stateless)         │
                        │   └─ /api/account export + deletion (GDPR)                              │
                        │            │  short-lived JWT (15 min) per request                       │
                        │            ▼                                                             │
                        │  backend        Express 4 + Prisma 5 (TypeScript) REST API under /api   │
                        │            │                                                             │
                        │            ▼                                                             │
                        │  Postgres       schema "public": app data (Prisma)                      │
                        │                 schema "auth":   Better Auth tables (Kysely)            │
                        └────────────────────────────────────────────────────────────────────────┘
                                     │
                                     └──► Yahoo Finance chart API (ticker prices, no personal data)
```

| Part | Folder | Runtime | Responsibility |
|---|---|---|---|
| Website | `website/` | nginx serving `next build` static output | Marketing, pricing, assistant setup guide, legal pages. No cookies, no tracking. |
| App | `frontend/` | Next.js standalone server (Node 22) | UI, authentication (Better Auth), MCP endpoint, account export and deletion. |
| API | `backend/` | Node 22, Express | All app data and business rules: money, investments, habits, fitness, goals, notes, plans, access control. |
| Database | Railway Postgres | Postgres | One database, two schemas: `public` (owned by Prisma, applied with `prisma db push` at start) and `auth` (Better Auth, migrated at app start in `instrumentation.ts`). |

### Request flow

1. The user signs in through Better Auth in the frontend; it sets an HTTP-only session cookie.
2. The browser asks `/api/auth/token` for a short-lived JWT (15 minutes) and calls the backend with `Authorization: Bearer <jwt>`.
3. The backend verifies the JWT against the frontend's JWKS (`BETTER_AUTH_URL/api/auth/jwks`), finds or creates the matching `User` row (new users start the free trial), and scopes every query to that user.
4. Plan guards run before the routes: `requireAccess` (trial or plan active), `requireModule` (module in plan), `requireHealthConsent` (Fitness). Rules live in `backend/src/services/plans.ts`.

### AI assistants (MCP)

- `frontend/src/app/api/mcp/route.ts` serves the MCP tools (`frontend/src/mcp/`). Assistants authenticate either with OAuth 2.1 (Better Auth's MCP plugin: discovery under `/.well-known/*`, dynamic client registration, Client ID Metadata Documents, consent page `/consent`) or with a personal access token (`hive_…`, Pro plan).
- For each request the route signs a backend JWT for that user, checks the plan (`/api/me` entitlements), then runs the tool. The MCP server never holds data of its own; every tool calls the backend as the user.
- There is no AI model inside Hive. The built-in AI (insights, AI weekly review via an OpenAI-compatible API) was removed and is preserved on branch `claude/with-ai-agent`.

### Plans and access

`User.plan` (PLUS | PRO), `planExpiresAt`, `planSource` (trial | grandfathered | manual | payment provider). New accounts: Plus for `TRIAL_DAYS` (30) with `planSource = trial`. Past the end date the account is paused; export and deletion keep working. Plans are set by `setPlan()`, called today by the admin API (`PUT /api/admin/plan`, `ADMIN_TOKEN`) and later by the payment provider's webhook.

## External services

| Service | Used for | Data it sees | Cost driver |
|---|---|---|---|
| **Railway** | Hosting all services and Postgres, deploys from GitHub, domains, TLS | Everything (processor) | Usage-based: CPU, RAM, egress, database size |
| **GitHub** | Source code, CI (`.github/workflows/ci.yml`: typecheck and build for backend, frontend, website) | Code only | Free for this size |
| **Better Auth** (library, self-hosted) | Sign-in, sessions, JWT/JWKS, OAuth server for assistants, API keys | Runs inside the frontend | Free (open source) |
| **Google OAuth** (optional) | "Continue with Google" when `GOOGLE_CLIENT_ID/SECRET` are set | Sign-in only | Free |
| **Yahoo Finance chart API** | Investment prices by ticker | Ticker symbols only | Free, unofficial: can rate-limit or change; replace before relying on it at scale |
| **Payment provider** (to add) | Subscriptions, invoices, VAT | Billing data | Fees per transaction |
| **Assistants** (Claude, ChatGPT, …) | Chosen by each user | What the user lets them read | Paid by the user |

### Environment variables

| Service | Variable | Purpose |
|---|---|---|
| backend | `DATABASE_URL` | Postgres connection |
| backend | `BETTER_AUTH_URL` | Frontend URL; issuer/audience and JWKS location for JWTs |
| backend | `CORS_ORIGIN` | Allowed browser origins (the frontend URL) |
| backend | `RATE_LIMIT_PER_MINUTE` | Per-IP request limit (default 300) |
| backend | `ADMIN_TOKEN` | Enables the admin plan API; keep secret |
| backend | `WEBSITE_URL`, `PRICING_URL` | Links to the website (legal pages, guide, "Choose a plan") |
| backend | `TRIAL_DAYS`, `GRANDFATHER_BEFORE` | Trial length; cut-off for accounts that keep full access |
| frontend | `DATABASE_URL` | Same Postgres (schema `auth`) |
| frontend | `BETTER_AUTH_SECRET`, `APP_BASE_URL` | Auth signing secret; public app URL (also the MCP resource) |
| frontend | `NEXT_PUBLIC_API_URL` (build arg) | Backend URL baked into the browser bundle |
| frontend | `WEBSITE_URL` | Legal links on the sign-up page |
| frontend | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |
| website | `NEXT_PUBLIC_APP_URL` (build arg) | Where "Sign in" / "Start your free month" point |

### Environments

- **QA**: Railway environment `qa` (services `backend-qa`, `frontend-qa`, `website-qa`, `Postgres-qa`), auto-deploys from the working branch.
- **Production**: Railway environment `production`; still runs the older app (`budgetingapp`, `outstanding-optimism`) on its own Postgres. Move it to this architecture once QA is signed off (see the checklist in COMPLIANCE.md).

## Growing and scaling

Hive is a CRUD app with small rows per user; Postgres and two Node services carry it a long way. Roughly in order of need:

### Up to ~1,000 active users: no changes needed
- One instance per service. Keep CI green, watch Railway metrics (CPU, memory, response times) and Postgres size.
- Turn on Railway's Postgres backups (daily, 7–30 days retention) and test a restore once.
- Add uptime checks (e.g. Railway healthchecks + a free external monitor such as UptimeRobot or Better Stack) and error tracking (Sentry free tier) — update the privacy policy if you add them.

### ~1,000–10,000 users: make it robust
- **Database**: add indexes from slow-query logs (most queries already filter by `userId`); use connection pooling (Prisma's `connection_limit`, or PgBouncer) before adding instances.
- **Migrations**: switch from `prisma db push` at start to versioned `prisma migrate deploy`, so schema changes are reviewed and reversible.
- **Horizontal scaling**: backend and frontend are stateless (sessions in Postgres, MCP stateless), so Railway replicas work as-is. Move the in-memory rate limiter and the per-key lock in `routes/notes.ts` to Postgres or Redis first, because they are per-process.
- **Market prices**: cache prices in Postgres with a TTL and move to a licensed provider; batch refreshes in a scheduled job.
- **Email**: add a transactional email provider (verification, password reset, trial-ending reminders, receipts).
- **Payments**: provider checkout + webhook → `setPlan()`. Store provider customer/subscription ids on `User`.

### 10,000+ users: split the load
- Read replica for reports; move heavy reports (net worth history, patterns) to precomputed tables refreshed by jobs.
- A job queue (e.g. pg-boss on Postgres, or Redis + BullMQ) for scheduled work: price refreshes, trial reminders, data retention clean-up, exports of very large accounts.
- CDN in front of the website (static) and the app's static assets.
- Consider moving the Better Auth tables and sessions to a dedicated database if auth traffic dominates.
- Multi-region only if latency matters; keep data residency (EU/CH) in mind and update the privacy policy.

### Cost guardrails
- Each service's Railway usage limits and alerts; Postgres size alerts.
- The MCP endpoint and API are rate-limited per IP and per personal token; keep it that way when scaling, since assistants can call tools in loops.

## Where things live

| Concern | Code |
|---|---|
| Plans, trial, entitlements, guards | `backend/src/services/plans.ts`, `backend/src/server.ts` |
| Preferences, consent, export, deletion | `backend/src/routes/me.ts`, `frontend/src/lib/account.ts`, `frontend/src/app/api/account/*` |
| Auth configuration | `frontend/src/lib/auth.ts`, `frontend/src/middleware.ts` |
| MCP server and tools | `frontend/src/app/api/mcp/route.ts`, `frontend/src/mcp/` |
| Plan gates and upgrade UI | `frontend/src/components/PlanGate.tsx`, `PreferencesProvider.tsx` |
| Website content | `website/src/app/*`, plans in `website/src/lib/plans.ts`, operator details in `website/src/lib/company.ts` |
| Showcase data for screenshots | `dev/showcase-seed.mjs` |
