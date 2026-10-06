# Life Hub — Development Notes

## Getting Started on a New Device

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)

### Quick local run (no Docker, no Auth0)

`dev/` runs the whole app against a throwaway embedded Postgres with sample data:

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd dev && npm install && npm start
# then open http://localhost:3000 and sign in as demo@hive.local / hive-demo-password
```

- Starts Postgres on 5433 (data in `dev/.data`), syncs the Prisma schema, the backend on 3001 and the frontend on 3000, then creates the demo account. Ctrl+C stops everything.
- Sample data is seeded on the first launch only. `npm run reset` deletes the database so the next start re-seeds it.
- Sign in as `demo@hive.local` / `hive-demo-password`; the sample data belongs to that account. You can also create more accounts at `/login`.
- Settings are passed to each process directly, so your `.env` files are not used, except for `ANTHROPIC_API_KEY` (from your shell or `backend/.env`) to enable AI Insights.

### First-time setup (full stack with Docker + Better Auth)

```bash
# 1. Start the database
docker-compose up -d

# 2. Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 3. Apply the database schema
cd backend && npm run db:push && cd ..

# 4. Configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, BETTER_AUTH_URL (the frontend URL), ANTHROPIC_API_KEY (optional, for AI Insights)
# The frontend needs DATABASE_URL, BETTER_AUTH_SECRET (any long random string), APP_BASE_URL and NEXT_PUBLIC_API_URL
# in frontend/.env.local. Optional: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to offer Google sign-in.

# 5. Start services
cd backend && npm run dev &
cd frontend && npm run dev
```

### MCP server (AI assistants)

The MCP server is hosted by the frontend at `<APP_BASE_URL>/api/mcp`; nothing to install or clone. Each user
connects it from **Settings → AI assistants** in one of two ways:

- **Sign in with Hive (OAuth):** add the address as a custom connector / remote MCP server. The assistant
  opens Hive's login and consent pages, then receives a token bound to that user. Discovery is served at
  `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server/api/auth`.
- **Personal token:** create one in Settings (`hive_...`) and send it as `Authorization: Bearer <token>`,
  e.g. `claude mcp add --transport http hive <APP_BASE_URL>/api/mcp --header "Authorization: Bearer hive_..."`.

Either way the MCP route signs the same short-lived backend JWT the web app uses, so tools act as that user.
Tools live in `frontend/src/mcp/tools/`.

### Branch

All feature work is on `feature/life-hub-expansion`. **Never merge or push directly to `main`** — it is auto-deployed.

---

## What Was Built (feature/life-hub-expansion)

### Phase 0 — UI Overhaul ✅
- Dark sidebar navigation (slate-900) with Lucide icons and active-link highlighting
- Inter font, indigo accent color, WCAG 2.1 AA contrast fixes
- Shared component library: `TypeBadge`, `StatusBadge`, `LoadingState`, `ErrorBanner`, `EmptyState`, `ConfirmDelete`, `PageHeader`
- Shared utilities: `constants.ts`, `types.ts`, `format.ts`
- Accessibility fixes across all existing pages (scope="col", htmlFor/id pairs, ARIA roles)

### Phase 1 — Investment Tracking ✅
- `InvestmentTrade` Prisma model
- Portfolio endpoint: aggregates trades into holdings, fetches live prices via yahoo-finance2 (15-min cache)
- Frontend: portfolio overview page + trade log page

### Phase 2 — Life Hub Backend ✅
- New Prisma models: `Habit`, `HabitLog`, `FitnessEntry`, `Goal`, `GoalMilestone`, `FitnessPlan`, `FitnessPlanDay`, `Note`
- Routes: `/api/habits`, `/api/fitness`, `/api/goals`, `/api/notes`, `/api/stats/life-overview`
- MCP validation workflow: `source: "MCP"` + `validatedAt: null` = pending; user approves/rejects in UI

### Phase 3 — Life Hub Frontend ✅
- `/habits` — 7-day completion grid, MCP pending validation banner
- `/fitness` — metric tabs, stat summary cards, history table, pending validation
- `/goals` — progress bars, deadline countdown, status filter, inline quick-update
- `/notes` — split list/editor view, tag filtering

### Phase 4 — MCP Server ✅
- `mcp-server/` package with StdioServerTransport (since replaced by the hosted `/api/mcp` endpoint)
- Tools: `get_financial_summary`, `get_accounts`, `get_month_detail`, `search_transactions`, `create_month`, `get_portfolio`, `log_trade`, `log_habit`, `get_habits_summary`, `log_fitness`, `get_fitness_history`, `generate_fitness_plan`, `create_fitness_plan`, `get_fitness_plan`, `get_goals`, `update_goal_progress`, `add_note`, `get_notes`, `get_life_stats`, `get_market_price`
- Service token auth bypass in backend middleware — MCP talks to backend without Auth0

### Phase 6 — Command redesign & life features ✅
- Command design: theme tokens in `globals.css`, light / dark / auto, five accent presets (Settings page), Geist fonts
- Sidebar with Money nested in Life, mobile drawer; ⌘K command bar; quick-add transaction dialog
- Habits grid with streaks and gamification; goal milestones; daily journal; net worth timeline; weekly review; patterns

### Phase 5 — AI Analytics ✅
- Backend endpoint `GET /api/stats/life-overview` ✅
- `POST /api/stats/insights` ✅ — sends the life-overview snapshot to Claude (`backend/src/services/insights.ts`, model `claude-opus-5-5`, structured JSON output) and returns `{ summary, highlights, alerts, suggestions }`. Requires `ANTHROPIC_API_KEY` in `backend/.env`; returns 503 with a clear message if missing.
- Dashboard "AI Insights" card ✅ (`frontend/src/components/AiInsightsCard.tsx`) — on-demand "Get Analysis" button (each click is one paid API call)

---

## Full Expansion Plan

> The plan below was authored at project start and reflects the full intended design.
> Items marked ✅ are implemented; others remain for future sessions.

---

# Life Hub — Full App Expansion Plan

## Context

The app is currently a functional but visually flat personal budgeting tool (Next.js 16 frontend + Express/Prisma/PostgreSQL backend). The user wants to:
1. Redesign the UI to be professional-grade (sidebar, icons, Inter font, indigo accent)
2. Add investment trade tracking with near-real-time market prices
3. Build an MCP server so Claude can query and write data (create months, log habits, etc.) with a human validation step
4. Expand from a finance app into a personal life hub: habits, fitness, goals, notes
5. Enable AI-powered stats and analysis across all modules via MCP

All new data is user-scoped (existing `userId` FK pattern). The backend is Auth0-protected Express + Prisma on PostgreSQL. No MCP infrastructure exists yet.

---

## Phase 0 — Foundation & UI Overhaul

**Goal:** Professional redesign + shared component library + fix all critical bugs from the audits.

### 0A — Shared utilities (do first, unblocks everything)
- `frontend/src/lib/constants.ts` — export `TRANSACTION_TYPES`, `TRANSACTION_STATUSES`, `TYPE_COLORS`, `STATUS_COLORS`, `MONTH_NAMES`
- `frontend/src/lib/types.ts` — export `Account`, `Category`, `Transaction`, `Month`, `BudgetTemplate` interfaces (promote from `months/[id]/page.tsx`)
- `frontend/src/lib/format.ts` — single `fmt(n)` currency formatter (replace 9 inline copies); `formatAmount(n, type)` with sign prefix

### 0B — Shared UI components
New files in `frontend/src/components/ui/`:
- `TypeBadge.tsx` — `<TypeBadge type="INCOME|SPENDING|TRANSFER" />` (replaces 5 inline copies)
- `StatusBadge.tsx` — `<StatusBadge status="PLANNED|PAID|PENDING|SKIPPED" />` (replaces 4 inline copies); fix SKIPPED contrast: use `text-slate-600` not `text-slate-400`
- `LoadingState.tsx` — `<LoadingState message />` with `role="status"` aria-live (replaces 8 variants)
- `ErrorBanner.tsx` — `<ErrorBanner message onDismiss? />` with `role="alert"` (replaces 3 incompatible patterns; fix 6 silent pages)
- `EmptyState.tsx` — `<EmptyState message cta? />` standardised to `p-8` (replaces 8 ad-hoc empties)
- `ConfirmDelete.tsx` — `<ConfirmDelete onConfirm onCancel label? />` (replaces 6 diverging patterns; fix `<span>` wrapping buttons in `months/page.tsx:243`)
- `PageHeader.tsx` — `<PageHeader title action? />` (title h1 + optional CTA button, used on every page)

### 0C — Sidebar layout redesign
**File:** `frontend/src/app/layout.tsx` — full rewrite

- Replace top navbar with a **fixed left sidebar** (w-64 dark slate-900 background)
- Add Google Fonts Inter via `<link>` in `<head>` (or Next.js font module)
- Install `lucide-react` — add icons to every nav item:
  - Dashboard → `LayoutDashboard`
  - Accounts → `Wallet`
  - Categories → `Tag`
  - Budgets → `FileText`
  - Months → `Calendar`
  - Reports → `BarChart2`
  - Search → `Search`
  - Investments → `TrendingUp`
  - Habits → `CheckCircle`
  - Fitness → `Activity`
  - Goals → `Target`
  - Notes → `StickyNote`
- Active link state via `usePathname()` (highlight current section)
- Mobile: hamburger toggle (hidden sidebar → slide-in drawer)
- Main content area: `ml-64` on desktop, full-width on mobile
- Add **skip navigation link** (`#main-content`) for accessibility

### 0D — Design system changes
**File:** `frontend/src/app/globals.css`
- Add Inter as body font
- Change focus ring to `focus:ring-indigo-500` (replaces `focus:ring-slate-400`)
- Change primary button to **indigo**: `bg-indigo-600 hover:bg-indigo-700 text-white`
- Replace all `text-slate-500` labels with `text-slate-600` (fixes WCAG contrast)
- Fix PENDING badge: `text-yellow-800` on `bg-yellow-100` (fixes ~3.5:1 contrast failure)

### 0E — Bug fixes from audits
- **Dashboard "Add Transaction" CTA**: change href from `/search` to open a quick-add modal (or link to `/months` with a `?action=add` param)
- **6 silent pages**: add `ErrorBanner` to `budgets/page.tsx`, `budgets/[id]/page.tsx`, `months/page.tsx`, `months/[id]/page.tsx`, `reports/page.tsx`, `search/page.tsx`
- **All `<th>` elements**: add `scope="col"`
- **All label/input pairs**: add `htmlFor` + matching `id`
- **TransactionForm type buttons**: add `aria-pressed={type === t}`
- **Status cycle button**: replace `title=` with `aria-label=`
- **Reports tab switcher**: add `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- **`months/page.tsx:243`**: change `<span>` container to `<div>`

---

## Phase 1 — Investment Trade Tracking

### 1A — Backend: new Prisma models
Add to `backend/prisma/schema.prisma`:

```prisma
model InvestmentTrade {
  id           String   @id @default(uuid())
  userId       String
  accountId    String
  ticker       String
  assetType    String   // "STOCK" | "ETF" | "CRYPTO" | "OTHER"
  tradeType    String   // "BUY" | "SELL"
  quantity     Float
  pricePerUnit Float
  fees         Float    @default(0)
  date         DateTime
  notes        String?
  createdAt    DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  account Account @relation(fields: [accountId], references: [id])

  @@index([userId])
}
```

### 1B — Backend: market price service
**New file:** `backend/src/services/marketPrice.ts`
- Use `yahoo-finance2` npm package (no API key required, free)
- Export `getQuote(ticker: string): Promise<{ price: number, currency: string, name: string }>`
- Cache results in-memory with 15-minute TTL (object keyed by ticker with timestamp)

### 1C — Backend: investment routes
**New file:** `backend/src/routes/investments.ts`

- `GET /api/investments/trades` — list all trades for user (filter by accountId, ticker, dateFrom, dateTo)
- `POST /api/investments/trades` — create trade
- `PUT /api/investments/trades/:id` — update trade
- `DELETE /api/investments/trades/:id` — delete trade
- `GET /api/investments/portfolio` — aggregate trades into holdings with live prices, cost basis, gain/loss
- `GET /api/investments/market-price/:ticker` — single price lookup

### 1D — Frontend: Investments pages
- `frontend/src/app/investments/page.tsx` — Portfolio overview with gradient hero, holdings table
- `frontend/src/app/investments/trades/page.tsx` — Trade log with inline CRUD

---

## Phase 2 — Life Hub Backend Models

### Habits
```prisma
model Habit {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String?
  frequency   String   @default("DAILY")  // "DAILY" | "WEEKLY"
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())

  user User       @relation(...)
  logs HabitLog[]
  @@index([userId])
}

model HabitLog {
  id          String    @id @default(uuid())
  habitId     String
  userId      String
  date        DateTime  @db.Date
  completed   Boolean   @default(true)
  note        String?
  source      String    @default("MANUAL")  // "MANUAL" | "MCP"
  validatedAt DateTime?  // null = pending validation for MCP entries

  habit Habit @relation(...)
  user  User  @relation(...)
  @@unique([habitId, date])
  @@index([userId])
}
```

### Fitness
```prisma
model FitnessEntry {
  id          String   @id @default(uuid())
  userId      String
  type        String   // "WEIGHT" | "BODY_FAT" | "STEPS" | "WORKOUT_DURATION" | custom
  value       Float
  unit        String   // "kg" | "lbs" | "%" | "steps" | "min"
  note        String?
  date        DateTime
  source      String   @default("MANUAL")  // "MANUAL" | "MCP" | "WEARABLE" (future)
  validatedAt DateTime?

  user User @relation(...)
  @@index([userId])
}
```

### Goals + FitnessPlan
```prisma
model Goal {
  id            String    @id @default(uuid())
  userId        String
  title         String
  description   String?
  type          String    // "FINANCIAL" | "HABIT" | "FITNESS" | "PERSONAL"
  targetValue   Float?
  currentValue  Float?    @default(0)
  unit          String?
  deadline      DateTime?
  status        String    @default("ACTIVE")  // "ACTIVE" | "COMPLETED" | "ABANDONED"
  linkedType    String?
  linkedId      String?
  fitnessPlanId String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user        User         @relation(...)
  milestones  GoalMilestone[]
  fitnessPlan FitnessPlan? @relation(fields: [fitnessPlanId], references: [id])
  @@index([userId])
}

model FitnessPlan {
  id          String   @id @default(uuid())
  userId      String
  goalId      String   @unique
  title       String
  description String   // markdown
  duration    Int      // weeks
  startDate   DateTime
  status      String   @default("ACTIVE")
  source      String   @default("MCP")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user     User             @relation(...)
  goal     Goal             @relation(...)
  sessions FitnessPlanDay[]
  @@index([userId])
}

model FitnessPlanDay {
  id            String  @id @default(uuid())
  fitnessPlanId String
  userId        String
  weekNumber    Int
  dayOfWeek     Int     // 1=Mon, 7=Sun
  activityType  String  // "WORKOUT" | "REST" | "ACTIVE_RECOVERY"
  title         String
  description   String  // markdown
  habitId       String? // linked Habit for completion tracking

  plan  FitnessPlan @relation(...)
  habit Habit?      @relation(...)
  @@index([fitnessPlanId])
}
```

**Key design:** when MCP generates a fitness plan, it auto-creates a recurring `Habit` for each workout day. Completing that habit logs to `HabitLog`, feeding back into goal progress.

### Notes
```prisma
model Note {
  id         String   @id @default(uuid())
  userId     String
  title      String
  content    String   // Markdown
  tags       String[] // PostgreSQL array
  linkedType String?  // "TRANSACTION" | "MONTH" | "GOAL" | "HABIT"
  linkedId   String?
  source     String   @default("MANUAL")  // "MANUAL" | "MCP"
  noteType   String   @default("NOTE")    // "NOTE" | "JOURNAL"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(...)
  @@index([userId])
}
```

---

## Phase 3 — Life Hub Frontend

### Validation UI pattern
Pages for habits and fitness show a yellow `bg-yellow-50 border-yellow-200` banner:
> "X items were added by AI — review and approve"
Each pending item has **Approve** / **Reject** buttons. Approving sets `validatedAt`; rejecting deletes the entry.

---

## Phase 4 — MCP Server

### Authentication to backend
- `SERVICE_TOKEN` env var in backend
- If `Authorization: Bearer <SERVICE_TOKEN>`, skip Auth0, attach system user `service|mcp`
- MCP server is only accessible locally

### MCP Tools

**Finance:** `get_financial_summary`, `get_accounts`, `get_month_detail`, `search_transactions`, `create_month`

**Investments:** `get_portfolio`, `log_trade`, `get_market_price`

**Habits:** `log_habit`, `get_habits_summary`

**Fitness:** `log_fitness`, `get_fitness_history`, `generate_fitness_plan`, `create_fitness_plan`, `get_fitness_plan`

**Goals:** `get_goals`, `update_goal_progress`

**Notes:** `add_note`, `get_notes`

**Stats:** `get_life_stats` → calls `/api/stats/life-overview`

---

## Phase 5 — AI Analytics Layer (pending)

### Backend ✅
`GET /api/stats/life-overview` — aggregate across all modules:
```json
{
  "finance": { "netWorth", "currentMonthNet", "topSpendingCategories" },
  "investments": { "portfolioValue", "totalGainLoss", "holdings" },
  "habits": { "activeHabits", "streaks", "weeklyCompletionRate" },
  "fitness": { "latestWeight", "latestBodyFat", "recentWorkouts" },
  "goals": { "active", "completedThisYear", "atRisk" },
  "notes": { "recentCount", "recentTags" }
}
```

### Frontend ✅
- New card on Dashboard: "AI Insights" with "Get Analysis" button
- Calls `POST /api/stats/insights` (the browser can't reach the local MCP server, so the backend calls the Claude API directly) → shows narrative summary with spending trends, habit consistency, goal risk alerts

---

## Confirmed Future Features

- **Net worth timeline** ✅ — `NetWorthSnapshot` model, `GET /api/stats/net-worth`, chart on the dashboard
- **Habit streaks & gamification** ✅ — streaks, XP and levels, perfect days, badges (`frontend/src/lib/habitStats.ts`)
- **Correlation insights** ✅ — `backend/src/services/patterns.ts`, `GET /api/stats/patterns`, MCP `get_correlations`; fed into AI Insights
- **Weekly review flow** ✅ — `/review` page, `POST /api/stats/weekly-review`, MCP `run_weekly_review`; saved as `REVIEW` notes
- **Daily journal** ✅ — Notes › Journal with calendar, streak and autosave; `Note.entryDate`
- **Goal milestones** ✅ — timeline on goal cards with progress-bar markers
- **Custom fitness metrics** — `FitnessEntry.type` is already a free string field

## Parked for Later

- **Wearable integration** — Apple Health, Garmin, Fitbit; `FitnessEntry.source` already accepts `"WEARABLE"`
- **Recurring transaction rules** — auto-suggestions
- **Spending alerts** — category over-budget notifications
- **CSV import** — bank statement bulk load with AI categorisation
