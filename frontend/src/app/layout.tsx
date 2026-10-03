import type { Metadata } from "next";
import "./globals.css";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { Sidebar } from "@/components/Sidebar";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Auth0Provider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          <div className="flex min-h-screen">
            <Sidebar />
            <main
              id="main-content"
              className="flex-1 min-w-0 ml-64 transition-all duration-200"
            >
              <div className="max-w-7xl mx-auto px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </Auth0Provider>
      </body>
    </html>
  );
}
