"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/components/PreferencesProvider";
import { moneyItems, lifeItems, isEnabled, matchesPath } from "@/lib/nav";

/**
 * The pages of the current section (Money or Life) as tabs. On phones these replace the sidebar;
 * on desktop the Money tabs stay so the section reads as one place.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const { modules } = usePreferences();

  for (const [section, items, desktop] of [
    ["Money", moneyItems, true],
    ["Life", lifeItems, false],
  ] as const) {
    const visible = items.filter((i) => isEnabled(i, modules));
    // Detail pages (a month, an account) keep their own back links instead.
    const current = visible.find((i) => i.href === pathname || i.also?.includes(pathname));
    if (!current || visible.length < 2) continue;
    return (
      <nav aria-label={section} className={`-mx-4 sm:mx-0 mb-5 ${desktop ? "" : "lg:hidden"}`}>
        <ul role="list" className="flex gap-1 overflow-x-auto px-4 sm:px-0 [scrollbar-width:none]">
          {visible.map((item) => {
            const active = matchesPath(item, pathname);
            const Icon = item.icon;
            return (
              <li key={item.href} className="shrink-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-medium border transition-colors ${
                    active
                      ? "bg-fg text-canvas border-fg"
                      : "bg-surface text-muted border-line hover:text-fg hover:border-line-strong"
                  }`}
                >
                  <Icon size={15} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
  return null;
}
