export type Billing = "monthly" | "yearly";

export interface Plan {
  id: "free" | "plus" | "pro";
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
    id: "free",
    name: "Free",
    tagline: "Everything you need to know where your money goes.",
    monthly: 0,
    yearly: 0,
    cta: "Start free",
    features: [
      "Unlimited accounts and transactions",
      "Month-by-month view with planned vs. paid",
      "Reports and spending rings",
      "1 budget template",
      "Search across everything",
      "Phone and desktop",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Your whole hive: money, habits, goals and AI.",
    monthly: 4,
    yearly: 40,
    highlight: true,
    cta: "Choose Plus",
    features: [
      "Everything in Free",
      "Unlimited budget templates",
      "Investments portfolio and trades",
      "Habits, fitness, goals, notes and journal",
      "AI next moves, 5 a day",
      "AI weekly review, 3 a day",
      "Connect your own AI assistant (MCP)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For people who lean on the AI every day.",
    monthly: 8,
    yearly: 80,
    cta: "Choose Pro",
    features: [
      "Everything in Plus",
      "AI next moves, 20 a day",
      "AI weekly review, 10 a day",
      "Personal access tokens for your own automations",
      "Early access to new modules",
      "Priority email support",
    ],
  },
];

/** Rows for the comparison table: plan id → included (true), not included (false) or a value. */
export const COMPARISON: { group: string; rows: { label: string; free: string | boolean; plus: string | boolean; pro: string | boolean }[] }[] = [
  {
    group: "Money",
    rows: [
      { label: "Accounts and transactions", free: "Unlimited", plus: "Unlimited", pro: "Unlimited" },
      { label: "Monthly view, planned vs. paid", free: true, plus: true, pro: true },
      { label: "Reports and spending rings", free: true, plus: true, pro: true },
      { label: "Budget templates", free: "1", plus: "Unlimited", pro: "Unlimited" },
      { label: "Investments portfolio", free: false, plus: true, pro: true },
    ],
  },
  {
    group: "Life",
    rows: [
      { label: "Habits and streaks", free: false, plus: true, pro: true },
      { label: "Fitness log and plan", free: false, plus: true, pro: true },
      { label: "Goals with milestones", free: false, plus: true, pro: true },
      { label: "Notes and daily journal", free: false, plus: true, pro: true },
    ],
  },
  {
    group: "AI",
    rows: [
      { label: "Next moves", free: false, plus: "5 a day", pro: "20 a day" },
      { label: "Weekly review", free: false, plus: "3 a day", pro: "10 a day" },
      { label: "Connect your AI assistant (MCP)", free: false, plus: true, pro: true },
      { label: "Personal access tokens", free: false, plus: false, pro: true },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Help by email", free: "Community", plus: "Email", pro: "Priority" },
      { label: "Early access to new modules", free: false, plus: false, pro: true },
    ],
  },
];
