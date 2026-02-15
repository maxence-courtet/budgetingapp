# Budget Tracking Application

A personal budget tracking app with multiple accounts, per-account category tracking, reusable budget templates, and monthly planning.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite with Prisma ORM

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Backend Setup

```bash
cd backend
npm install
npm run db:setup    # Creates database + seeds sample data
npm run dev         # Starts on http://localhost:3001
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev         # Starts on http://localhost:3000
```

Open http://localhost:3000 in your browser.

## Project Structure

```
budget-app/
├── backend/
│   ├── src/
│   │   ├── routes/           # Express API routes
│   │   │   ├── accounts.ts   # Account CRUD + balance calculation
│   │   │   ├── budgets.ts    # Budget template CRUD + definitions
│   │   │   ├── categories.ts # Category CRUD
│   │   │   ├── months.ts     # Month CRUD + apply budget
│   │   │   ├── reports.ts    # Account summary, category detail, monthly summary
│   │   │   ├── search.ts     # Global transaction search
│   │   │   └── transactions.ts # Transaction CRUD + status updates
│   │   ├── services/
│   │   │   └── prisma.ts     # Prisma client singleton
│   │   └── server.ts         # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Sample data
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── accounts/     # Account list + detail pages
│   │   │   ├── budgets/      # Budget template list + editor
│   │   │   ├── categories/   # Category management
│   │   │   ├── months/       # Month list + detail (transaction management)
│   │   │   ├── reports/      # Account summary + monthly summary reports
│   │   │   ├── search/       # Global transaction search
│   │   │   ├── layout.tsx    # App layout with navigation
│   │   │   └── page.tsx      # Dashboard
│   │   ├── components/
│   │   │   └── TransactionForm.tsx
│   │   └── lib/
│   │       └── api.ts        # API client functions
│   ├── package.json
│   └── next.config.ts
└── README.md
```

## API Endpoints

### Accounts (`/api/accounts`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all accounts with balances |
| GET | `/:id` | Account detail with category balances |
| POST | `/` | Create account |
| PUT | `/:id` | Update account |
| DELETE | `/:id` | Delete account (if no transactions) |

### Categories (`/api/categories`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List categories with usage counts |
| POST | `/` | Create category |
| PUT | `/:id` | Update category name |
| DELETE | `/:id` | Delete category (if unused) |

### Transactions (`/api/transactions`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List transactions (filterable) |
| GET | `/:id` | Get single transaction |
| POST | `/` | Create transaction |
| PUT | `/:id` | Update transaction |
| DELETE | `/:id` | Delete transaction |
| PATCH | `/:id/status` | Update transaction status |

### Budget Templates (`/api/budgets`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all templates |
| GET | `/:id` | Template detail with definitions |
| POST | `/` | Create template |
| PUT | `/:id` | Update template name |
| DELETE | `/:id` | Delete template |
| POST | `/:id/definitions` | Add definition |
| PUT | `/:id/definitions/:defId` | Update definition |
| DELETE | `/:id/definitions/:defId` | Delete definition |

### Months (`/api/months`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List months with summaries |
| GET | `/:id` | Month detail with transactions |
| POST | `/` | Create month (optionally apply budget) |
| PUT | `/:id` | Update month |
| DELETE | `/:id` | Delete month and transactions |
| POST | `/:id/apply-budget` | Apply budget template to month |

### Reports (`/api/reports`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/account-summary` | All accounts with category breakdowns |
| GET | `/category-detail?accountId=X&categoryId=Y` | Category detail for account |
| GET | `/monthly-summary/:monthId` | Monthly income/spending summary |

### Search (`/api/search`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/?query=X&accountId=X&categoryId=X&type=X&status=X&dateFrom=X&dateTo=X&amountMin=X&amountMax=X` | Search transactions |

## Key Business Logic

### Transaction Types
- **INCOME**: Money enters an account (`toAccountId` required)
- **SPENDING**: Money leaves an account (`fromAccountId` required)
- **TRANSFER**: Money moves between accounts (both required). Supports `toCategoryId` for tracking different categories on each side.

### Balance Calculation
- Only **PAID** transactions affect balances
- Account balance = SUM(incoming PAID amounts) - SUM(outgoing PAID amounts)
- Category balances are tracked **per account**, not globally

### Transaction Statuses
- **PLANNED**: Budget placeholder, no balance impact
- **PAID**: Confirmed, affects balances
- **PENDING**: Awaiting confirmation, no balance impact
- **SKIPPED**: Cancelled, no balance impact

### Budget Templates
- Define reusable monthly transaction sets
- Applying a template creates PLANNED transactions in the target month
- Editing a template does NOT affect already-applied months

## Sample Data

The seed creates:
- 3 accounts: Main Checking, Savings, Credit Card
- 10 categories: Salary, Rent, Groceries, Utilities, Car, House Savings, Investing, Entertainment, Dining Out, Transportation
- 1 budget template: Standard Monthly Budget
- 3 months: January 2024 (fully paid), February 2024 (mixed), March 2024 (empty)

## Testing

```bash
# Test backend health
curl http://localhost:3001/api/health

# Test accounts
curl http://localhost:3001/api/accounts

# Test months
curl http://localhost:3001/api/months

# Re-seed database
cd backend && npm run db:seed
```
