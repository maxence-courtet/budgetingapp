import {
  LayoutDashboard,
  Wallet,
  Tag,
  FileText,
  ArrowLeftRight,
  BarChart2,
  TrendingUp,
  CheckCircle,
  Activity,
  Target,
  StickyNote,
  CalendarCheck,
  LucideIcon,
} from "lucide-react";

/** Optional areas of the app, matching the backend's MODULES. Money is always on. */
export type ModuleId = "investments" | "habits" | "fitness" | "goals" | "notes" | "review";
export const ALL_MODULES: ModuleId[] = ["investments", "habits", "fitness", "goals", "notes", "review"];

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown only when the user turned this module on. */
  module?: ModuleId;
  /** Other paths that belong to this item (it shows as current on them too). */
  also?: string[];
  /** One line for the welcome walkthrough and the Settings module list. */
  description?: string;
}

export const homeItem: NavItem = { href: "/", label: "Home", icon: LayoutDashboard };

/** The Money section: everyday pages only. Set-up pages live under Settings (setupItems). */
export const moneyItems: NavItem[] = [
  { href: "/months", label: "Transactions", icon: ArrowLeftRight, also: ["/search"] },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  {
    href: "/investments",
    label: "Investments",
    icon: TrendingUp,
    module: "investments",
    description: "Portfolio, trades and live prices",
  },
];

export const lifeItems: NavItem[] = [
  { href: "/habits", label: "Habits", icon: CheckCircle, module: "habits", description: "Daily check-ins and streaks" },
  { href: "/fitness", label: "Fitness", icon: Activity, module: "fitness", description: "Weight, workouts and a training plan" },
  { href: "/goals", label: "Goals", icon: Target, module: "goals", description: "Targets with milestones and progress" },
  { href: "/notes", label: "Notes", icon: StickyNote, module: "notes", description: "Notes and a daily journal" },
  { href: "/review", label: "Weekly review", icon: CalendarCheck, module: "review", description: "An AI recap of your week" },
];

/** Things set up once and rarely changed, reached from Settings. */
export const setupItems: NavItem[] = [
  { href: "/accounts", label: "Accounts", icon: Wallet, description: "Bank, savings and investment accounts" },
  { href: "/categories", label: "Categories", icon: Tag, description: "How transactions are grouped" },
  { href: "/budgets", label: "Budget templates", icon: FileText, description: "Planned income and spending, reused each month" },
];

export const moduleItems: NavItem[] = [...moneyItems, ...lifeItems].filter((i) => i.module);

export const navItems = [homeItem, ...moneyItems, ...lifeItems, ...setupItems];

export function isEnabled(item: NavItem, modules: readonly ModuleId[]) {
  return !item.module || modules.includes(item.module);
}

export function matchesPath(item: NavItem, pathname: string) {
  if (item.href === "/") return pathname === "/";
  return [item.href, ...(item.also ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
