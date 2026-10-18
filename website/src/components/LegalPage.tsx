import Link from "next/link";
import { LEGAL_UPDATED, hasPlaceholders } from "@/lib/company";

/** Shared layout for the legal pages: readable column, last-updated date, links between them. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-text">Legal</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
      {hasPlaceholders && (
        <p role="note" className="mt-6 rounded-xl border border-accent/50 bg-accent-soft px-4 py-3 text-sm text-fg-2">
          Draft: details in brackets are still to be completed by the operator before launch.
        </p>
      )}
      <div className="legal mt-10">{children}</div>
      <nav aria-label="Legal" className="mt-16 pt-6 border-t border-line flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <Link href="/legal/terms/" className="hover:text-fg">Terms of service</Link>
        <Link href="/legal/privacy/" className="hover:text-fg">Privacy policy</Link>
        <Link href="/legal/notice/" className="hover:text-fg">Legal notice</Link>
      </nav>
    </article>
  );
}
