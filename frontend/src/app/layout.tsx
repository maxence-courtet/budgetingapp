import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { Sidebar } from "@/components/Sidebar";
import { CommandBar } from "@/components/CommandBar";
import { QuickAddButton, QuickAddTransaction } from "@/components/QuickAddTransaction";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { appearanceInitScript, DEFAULT_ACCENT } from "@/lib/appearance";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Life Hub",
  description: "Personal finance, habits, fitness, and goals — all in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-accent={DEFAULT_ACCENT}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      <body>
        <Auth0Provider>
          <AppearanceProvider>
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
          </AppearanceProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
