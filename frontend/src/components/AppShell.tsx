"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { CommandBar } from "@/components/CommandBar";
import { QuickAddButton, QuickAddTransaction } from "@/components/QuickAddTransaction";

// The login and consent pages render on their own, without the app navigation.
const STANDALONE_PAGES = ["/login", "/consent"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE_PAGES.includes(pathname)) return <>{children}</>;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-surface focus:text-fg focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen">
        <Sidebar />
        <main id="main-content" className="flex-1 min-w-0 pt-14 lg:pt-0 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-12">
            <div className="flex items-center gap-3 mb-8">
              <CommandBar />
              <QuickAddButton />
            </div>
            {children}
          </div>
        </main>
      </div>
      <QuickAddTransaction />
    </>
  );
}
