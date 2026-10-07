"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { SectionTabs } from "@/components/SectionTabs";
import { CommandBar } from "@/components/CommandBar";
import { Welcome } from "@/components/Welcome";
import { SpotlightTour } from "@/components/SpotlightTour";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { QuickAddButton, QuickAddTransaction } from "@/components/QuickAddTransaction";

// The login and consent pages render on their own, without the app navigation.
const STANDALONE_PAGES = ["/login", "/consent"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (STANDALONE_PAGES.includes(pathname)) return <>{children}</>;

  return (
    <PreferencesProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-surface focus:text-fg focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen">
        <Sidebar />
        <main id="main-content" className="flex-1 min-w-0 pt-14 lg:pt-0 lg:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12">
            {/* On phones the search lives behind the header's button and "+" in the bottom bar. */}
            <div className="flex items-center gap-3 lg:mb-8">
              <CommandBar />
              <div className="hidden lg:block" data-tour="add">
                <QuickAddButton />
              </div>
            </div>
            <SectionTabs />
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
      <QuickAddTransaction />
      <Welcome />
      <SpotlightTour />
    </PreferencesProvider>
  );
}
