import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SIGN_UP } from "@/lib/links";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.14em] text-accent-text">{children}</p>;
}

/** The title block at the top of a secondary page. */
export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-20 pb-6 sm:pb-10">
        <div className="max-w-3xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="text-balance mt-3 text-[38px] leading-[1.05] sm:text-6xl font-semibold tracking-[-0.035em]">{title}</h1>
          <p className="mt-5 text-lg text-muted leading-relaxed">{text}</p>
        </div>
      </div>
    </section>
  );
}

/** Closing block of a page: the free month, and where to read on. */
export function PageEnd({ next }: { next?: { href: string; label: string } }) {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em]">Start your hive today.</h2>
        <p className="mt-4 text-lg text-muted">Use everything free for a month. No card needed, nothing charged automatically.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={SIGN_UP}
            className="h-12 px-7 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-ink font-semibold hover:brightness-95"
          >
            Start your free month <ArrowRight size={18} aria-hidden="true" />
          </a>
          {next && (
            <Link
              href={next.href}
              className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface font-medium hover:border-fg-2"
            >
              {next.label} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
