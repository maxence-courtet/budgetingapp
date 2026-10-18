"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PiggyBank, Sprout, Menu, Plus, BarChart2, LucideIcon } from "lucide-react";
import { usePreferences } from "@/components/PreferencesProvider";
import { openQuickAdd } from "@/components/QuickAddTransaction";
import { openMenu } from "@/components/Sidebar";
import { homeItem, moneyItems, lifeItems, isEnabled, matchesPath } from "@/lib/nav";

/** Phone navigation: Home, Money, add a transaction, Life and More, within thumb reach. */
export function BottomNav() {
  const pathname = usePathname();
  const { modules } = usePreferences();
  const life = lifeItems.filter((i) => isEnabled(i, modules));
  const money = moneyItems.filter((i) => isEnabled(i, modules));

  const inMoney = money.some((i) => matchesPath(i, pathname) && (life.length > 0 || i.href !== "/reports"));
  const inLife = life.some((i) => matchesPath(i, pathname));
  // Life opens on the page you were last on in that section, else the first one.
  const lifeHref = life.find((i) => matchesPath(i, pathname))?.href ?? life[0]?.href;

  return (
    <nav
      aria-label="Sections"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-side/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <ul role="list" className="grid grid-cols-5 h-16 max-w-md mx-auto">
        <Tab href="/" label="Home" icon={Home} active={matchesPath(homeItem, pathname)} />
        <Tab href="/months" label="Money" icon={PiggyBank} active={inMoney} tour="money" />
        <li className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => openQuickAdd()}
            aria-label="New transaction"
            data-tour="add"
            className="w-12 h-12 -mt-5 rounded-2xl bg-accent text-accent-ink shadow-lg shadow-black/15 ring-4 ring-canvas flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={22} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </li>
        {lifeHref ? (
          <Tab href={lifeHref} label="Life" icon={Sprout} active={inLife} tour="life" />
        ) : (
          // Money only: Reports gets the slot Life would have had.
          <Tab href="/reports" label="Reports" icon={BarChart2} active={pathname.startsWith("/reports")} />
        )}
        <li>
          <button
            type="button"
            onClick={openMenu}
            data-tour="settings"
            className="w-full h-full flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted"
          >
            <Menu size={20} aria-hidden="true" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

function Tab({ href, label, icon: Icon, active, tour }: { href: string; label: string; icon: LucideIcon; active: boolean; tour?: string }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        data-tour={tour}
        className={`w-full h-full flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
          active ? "text-fg" : "text-muted"
        }`}
      >
        <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${active ? "bg-accent-soft" : ""}`}>
          <Icon size={20} aria-hidden="true" className={active ? "text-accent" : ""} />
        </span>
        {label}
      </Link>
    </li>
  );
}
