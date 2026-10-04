"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, ChevronRight, PiggyBank, Menu, X } from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { homeItem, moneyItems, lifeItems, NavItem } from "@/lib/nav";

const OPEN_KEY = "lh-nav-open";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  // The mobile drawer closes on navigation and on Escape.
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    try {
      setOpen(JSON.parse(localStorage.getItem(OPEN_KEY) ?? "{}"));
    } catch {
      // Unreadable storage: sections fall back to their defaults.
    }
  }, []);

  const moneyActive = moneyItems.some((i) => isActive(i.href));
  const lifeActive = moneyActive || lifeItems.some((i) => isActive(i.href));

  // The groups holding the current page always open.
  useEffect(() => {
    if (lifeActive || moneyActive) {
      setOpen((o) => ({ ...o, ...(lifeActive && { Life: true }), ...(moneyActive && { Money: true }) }));
    }
  }, [lifeActive, moneyActive]);

  function toggle(label: string) {
    setOpen((o) => {
      const next = { ...o, [label]: !o[label] };
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable: the toggle still applies for this visit.
      }
      return next;
    });
  }

  return (
    <>
    <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 px-4 bg-side border-b border-line">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        aria-controls="sidebar"
        className="w-10 h-10 -ml-2 rounded-lg flex items-center justify-center text-fg hover:bg-surface-2"
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      <div className="w-7 h-7 rounded-lg bg-accent text-accent-ink flex items-center justify-center">
        <span className="text-sm font-bold">L</span>
      </div>
      <span className="font-semibold tracking-tight text-fg">Life Hub</span>
    </div>
    {mobileOpen && (
      <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
    )}
    <aside
      id="sidebar"
      className={`fixed inset-y-0 left-0 w-64 bg-side border-r border-line flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 lg:visible ${
        mobileOpen ? "translate-x-0" : "-translate-x-full invisible"
      }`}
    >
      <button
        type="button"
        onClick={() => setMobileOpen(false)}
        aria-label="Close menu"
        className="lg:hidden absolute top-4 right-3 w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div className="w-7 h-7 rounded-lg bg-accent text-accent-ink flex items-center justify-center shrink-0">
          <span className="text-sm font-bold">L</span>
        </div>
        <span className="font-semibold tracking-tight text-fg">Life Hub</span>
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <ul role="list">
          <NavLink item={homeItem} active={isActive(homeItem.href)} />
        </ul>

        <GroupToggle
          label="Life"
          expanded={!!open.Life}
          onToggle={() => toggle("Life")}
          count={lifeItems.length + moneyItems.length}
          showDot={!open.Life && lifeActive}
          className="mt-3"
          eyebrow
        />
        {open.Life && (
          <div id="nav-life" className="space-y-0.5">
            <GroupToggle
              label="Money"
              icon={<PiggyBank size={16} aria-hidden="true" className={moneyActive ? "text-accent" : "text-faint"} />}
              expanded={!!open.Money}
              onToggle={() => toggle("Money")}
              count={moneyItems.length}
              showDot={!open.Money && moneyActive}
            />
            {open.Money && (
              <ul id="nav-money" role="list" className="ml-[22px] pl-2 border-l border-line space-y-0.5">
                {moneyItems.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </ul>
            )}
            <ul role="list" className="space-y-0.5">
              {lifeItems.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-line px-3 py-3 space-y-0.5">
        {user?.email && <p className="px-3 mb-1 text-xs text-muted truncate">{user.email}</p>}
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-surface-2 text-fg"
              : "text-muted hover:text-fg hover:bg-surface-2"
          }`}
        >
          <Settings size={16} aria-hidden="true" />
          Settings
        </Link>
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface-2 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </a>
      </div>
    </aside>
    </>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon } = item;
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg hover:bg-surface-2"
        }`}
      >
        <Icon size={16} aria-hidden="true" className={active ? "text-accent" : "text-faint group-hover:text-fg"} />
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  );
}

function GroupToggle({
  label,
  icon,
  expanded,
  onToggle,
  count,
  showDot,
  eyebrow,
  className = "",
}: {
  label: string;
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  showDot: boolean;
  eyebrow?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={`nav-${label.toLowerCase()}`}
      className={`w-full flex items-center gap-3 px-3 h-9 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors ${className}`}
    >
      {icon}
      <span
        className={`flex-1 text-left ${
          eyebrow ? "font-mono text-[11px] uppercase tracking-[0.08em]" : "text-sm font-medium"
        }`}
      >
        {label}
      </span>
      {showDot && <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />}
      <span className="font-mono text-[11px] text-faint">{count}</span>
      <ChevronRight size={14} aria-hidden="true" className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
    </button>
  );
}
