import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Personal budget tracking application",
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/categories", label: "Categories" },
  { href: "/budgets", label: "Budgets" },
  { href: "/months", label: "Months" },
  { href: "/reports", label: "Reports" },
  { href: "/search", label: "Search" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Auth0Provider>
        <div className="min-h-screen">
          <nav className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex items-center h-14 gap-8">
                <Link href="/" className="text-lg font-bold text-slate-900">
                  Budget Tracker
                </Link>
                <div className="flex gap-1 flex-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <LogoutButton />
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
        </div>
        </Auth0Provider>
      </body>
    </html>
  );
}
