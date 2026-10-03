"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LogOut,
} from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0/client";

const navSections = [
  {
    label: "Finance",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/categories", label: "Categories", icon: Tag },
      { href: "/budgets", label: "Budgets", icon: FileText },
      { href: "/months", label: "Months", icon: Calendar },
      { href: "/reports", label: "Reports", icon: BarChart2 },
      { href: "/investments", label: "Investments", icon: TrendingUp },
      { href: "/search", label: "Search", icon: Search },
    ],
  },
  {
    label: "Life",
    items: [
      { href: "/habits", label: "Habits", icon: CheckCircle },
      { href: "/fitness", label: "Fitness", icon: Activity },
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/notes", label: "Notes", icon: StickyNote },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white text-sm font-bold">L</span>
        </div>
        <span className="text-white font-semibold text-base tracking-tight">Life Hub</span>
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {section.label}
            </p>
            <ul role="list" className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-slate-800 px-3 py-4">
        {user && (
          <div className="px-3 mb-2">
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        )}
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </a>
      </div>
    </aside>
  );
}
