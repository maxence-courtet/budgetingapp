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
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Second key of the "G then <key>" shortcut. */
  key: string;
}

export const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Money",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, key: "D" },
      { href: "/accounts", label: "Accounts", icon: Wallet, key: "A" },
      { href: "/categories", label: "Categories", icon: Tag, key: "C" },
      { href: "/budgets", label: "Budgets", icon: FileText, key: "B" },
      { href: "/months", label: "Months", icon: Calendar, key: "M" },
      { href: "/reports", label: "Reports", icon: BarChart2, key: "R" },
      { href: "/investments", label: "Investments", icon: TrendingUp, key: "I" },
      { href: "/search", label: "Search", icon: Search, key: "S" },
    ],
  },
  {
    label: "Life",
    items: [
      { href: "/habits", label: "Habits", icon: CheckCircle, key: "H" },
      { href: "/fitness", label: "Fitness", icon: Activity, key: "F" },
      { href: "/goals", label: "Goals", icon: Target, key: "G" },
      { href: "/notes", label: "Notes", icon: StickyNote, key: "N" },
    ],
  },
];

export const navItems = navSections.flatMap((s) => s.items);

export function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}
