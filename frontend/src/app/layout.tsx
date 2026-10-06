import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
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
        <AppearanceProvider>
          <AppShell>{children}</AppShell>
        </AppearanceProvider>
      </body>
    </html>
  );
}
