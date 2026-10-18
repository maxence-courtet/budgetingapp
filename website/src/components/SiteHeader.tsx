"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { HiveLogo } from "@/components/HiveLogo";
import { SIGN_IN, SIGN_UP } from "@/lib/links";

const NAV = [
  { href: "/how-it-works/", label: "How it works" },
  { href: "/features/", label: "Features" },
  { href: "/privacy/", label: "Privacy" },
  { href: "/connect/", label: "Connect AI" },
  { href: "/pricing/", label: "Pricing" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
    <header
      className={`sticky top-0 z-40 transition-colors ${
        open
          ? "bg-canvas border-b border-line"
          : scrolled
          ? "bg-canvas/85 backdrop-blur-md border-b border-line"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center gap-6">
        <Link href="/" aria-label="Hive home" className="mr-auto" onClick={() => setOpen(false)}>
          <HiveLogo size={26} />
        </Link>
        <nav aria-label="Main" className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-fg transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <a href={SIGN_IN} className="h-10 px-4 inline-flex items-center rounded-xl text-sm font-medium text-fg hover:bg-surface-2">
            Sign in
          </a>
          <a
            href={SIGN_UP}
            className="h-10 px-4 inline-flex items-center rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:brightness-95"
          >
            Try it free
          </a>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden -mr-2 w-10 h-10 rounded-lg flex items-center justify-center text-fg hover:bg-surface-2"
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>

    </header>
    {/* Outside the header: its backdrop blur would make this fixed panel size itself to the header, not the screen. */}
      {open && (
        <div id="mobile-menu" className="md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-canvas border-t border-line px-4 pt-4 pb-8 flex flex-col overflow-y-auto">
          <nav aria-label="Main" className="flex flex-col">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="py-4 text-2xl font-semibold tracking-tight border-b border-line"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto grid grid-cols-2 gap-3">
            <a href={SIGN_IN} className="h-12 inline-flex items-center justify-center rounded-xl border border-line-strong font-medium">
              Sign in
            </a>
            <a href={SIGN_UP} className="h-12 inline-flex items-center justify-center rounded-xl bg-accent text-accent-ink font-semibold">
              Try it free
            </a>
          </div>
        </div>
      )}
    </>
  );
}
