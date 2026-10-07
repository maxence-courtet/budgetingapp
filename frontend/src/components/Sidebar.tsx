"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings, Search, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { HiveLogo } from "@/components/HiveLogo";
import { usePreferences } from "@/components/PreferencesProvider";
import { openCommandBar } from "@/components/CommandBar";
import { homeItem, moneyItems, lifeItems, NavItem, isEnabled, matchesPath } from "@/lib/nav";

const OPEN_MENU_EVENT = "lh:open-menu";

/** Opens the navigation drawer on phones (the bottom bar's "More"). */
export function openMenu() {
  window.dispatchEvent(new Event(OPEN_MENU_EVENT));
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const { modules } = usePreferences();
  const [mobileOpen, setMobileOpen] = useState(false);

  const opener = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  // The mobile drawer opens from the bottom bar, and closes on navigation and on Escape.
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onOpen = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setMobileOpen(true);
    };
    window.addEventListener(OPEN_MENU_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MENU_EVENT, onOpen);
  }, []);
  // While open: focus moves into the drawer and stays there, and the page behind doesn't scroll.
  // On close, focus returns to the menu button.
  useEffect(() => {
    if (!mobileOpen) {
      // Focus goes back to whatever opened the drawer (the bottom bar's More button).
      if (wasOpen.current) opener.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setMobileOpen(false);
      if (e.key !== "Tab" || !asideRef.current) return;
      const items = asideRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const money = moneyItems.filter((i) => isEnabled(i, modules));
  const life = lifeItems.filter((i) => isEnabled(i, modules));

  return (
    <>
    <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 px-4 bg-side border-b border-line">
      <Link href="/" aria-label="Hive home" className="mr-auto">
        <HiveLogo size={24} />
      </Link>
      <button
        type="button"
        onClick={openCommandBar}
        aria-label="Search"
        className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-fg hover:bg-surface-2"
      >
        <Search size={20} aria-hidden="true" />
      </button>
    </div>
    {mobileOpen && (
      <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
    )}
    <aside
      ref={asideRef}
      id="sidebar"
      {...(mobileOpen ? { role: "dialog", "aria-modal": true, "aria-label": "Menu" } : {})}
      className={`fixed inset-y-0 left-0 w-64 bg-side border-r border-line flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 lg:visible ${
        mobileOpen ? "translate-x-0" : "-translate-x-full invisible"
      }`}
    >
      <button
        type="button"
        ref={closeButtonRef}
        onClick={() => setMobileOpen(false)}
        aria-label="Close menu"
        className="lg:hidden absolute top-4 right-3 w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
      >
        <X size={18} aria-hidden="true" />
      </button>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <HiveLogo size={26} />
      </div>

      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2">
        <ul role="list">
          <NavLink item={homeItem} pathname={pathname} />
        </ul>
        <NavGroup label="Money" items={money} pathname={pathname} />
        {life.length > 0 && <NavGroup label="Life" items={life} pathname={pathname} />}
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
        <button
          type="button"
          onClick={() => authClient.signOut().finally(() => (window.location.href = "/login"))}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface-2 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
    </>
  );
}

function NavGroup({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  const id = `nav-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="mt-5">
      <h2 id={id} className="px-3 mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
        {label}
      </h2>
      <ul role="list" aria-labelledby={id} className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </ul>
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, label, icon: Icon } = item;
  const active = matchesPath(item, pathname);
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg hover:bg-surface-2"}`}
      >
        <Icon size={16} aria-hidden="true" className={active ? "text-accent" : "text-faint group-hover:text-fg"} />
        <span className="flex-1">{label}</span>
      </Link>
    </li>
  );
}
