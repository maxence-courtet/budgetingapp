import {
  LayoutDashboard,
  Wallet,
  Tag,
  FileText,
  Calendar,
  BarChart2,
  Search,
  TrendingUp,
  CheckCircle,
  Activity,
  Target,
  StickyNote,
  CalendarCheck,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const homeItem: NavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };

/** Finance pages, shown as the collapsible "Money" group inside Life. */
export const moneyItems: NavItem[] = [
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/budgets", label: "Budgets", icon: FileText },
  { href: "/months", label: "Months", icon: Calendar },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/investments", label: "Investments", icon: TrendingUp },
  { href: "/search", label: "Search", icon: Search },
];

export const lifeItems: NavItem[] = [
  { href: "/habits", label: "Habits", icon: CheckCircle },
  { href: "/fitness", label: "Fitness", icon: Activity },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/review", label: "Weekly review", icon: CalendarCheck },
];

export const navItems = [homeItem, ...moneyItems, ...lifeItems];
