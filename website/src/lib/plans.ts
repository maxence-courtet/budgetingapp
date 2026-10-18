export type Billing = "monthly" | "yearly";

/** Length of the free trial every new account starts with (backend TRIAL_DAYS). */
export const TRIAL_DAYS = 30;

export interface Plan {
  id: "plus" | "pro";
  name: string;
  tagline: string;
  /** CHF per month, billed monthly / per year, billed yearly. */
  monthly: number;
  yearly: number;
  features: string[];
  highlight?: boolean;
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: "plus",
    name: "Plus",
    tagline: "Your whole hive: money, habits, goals and your AI assistant.",
    monthly: 4,
    yearly: 40,
    highlight: true,
    cta: "Start your free month",
    features: [
      "Unlimited accounts and transactions",
      "Months with planned vs. paid, reports and spending rings",
      "Unlimited budget templates",
      "Investments portfolio and trades",
      "Habits, fitness, goals, notes and journal",
      "Weekly review across money and habits",
      "Connect your own AI assistant (MCP)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For tinkerers who automate their money.",
    monthly: 6,
    yearly: 60,
    cta: "Start your free month",
    features: [
      "Everything in Plus",
      "Personal access tokens for your own automations",
      "Early access to new modules",
      "Priority email support",
    ],
  },
];

type Cell = string | boolean;

/** Rows for the comparison table: included (true), not included (false) or a value. */
export const COMPARISON: { group: string; rows: { label: string; plus: Cell; pro: Cell }[] }[] = [
  {
    group: "Money",
    rows: [
      { label: "Accounts and transactions", plus: "Unlimited", pro: "Unlimited" },
      { label: "Monthly view, planned vs. paid", plus: true, pro: true },
      { label: "Reports and spending rings", plus: true, pro: true },
      { label: "Budget templates", plus: "Unlimited", pro: "Unlimited" },
      { label: "Investments portfolio", plus: true, pro: true },
    ],
  },
  {
    group: "Life",
    rows: [
      { label: "Habits and streaks", plus: true, pro: true },
      { label: "Fitness log and plan", plus: true, pro: true },
      { label: "Goals with milestones", plus: true, pro: true },
      { label: "Notes and daily journal", plus: true, pro: true },
      { label: "Weekly review", plus: true, pro: true },
    ],
  },
  {
    group: "Assistants",
    rows: [
      { label: "Connect your AI assistant (MCP)", plus: true, pro: true },
      { label: "Personal access tokens", plus: false, pro: true },
    ],
  },
  {
    group: "Your data",
    rows: [
      { label: "Export everything, any time", plus: true, pro: true },
      { label: "Help by email", plus: "Email", pro: "Priority" },
      { label: "Early access to new modules", plus: false, pro: true },
    ],
  },
];
