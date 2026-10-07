import Link from "next/link";
import { HiveLogo } from "@/components/HiveLogo";
import { SIGN_IN, SIGN_UP } from "@/lib/links";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <HiveLogo size={24} />
          <p className="mt-3 text-sm text-muted max-w-xs">
            Three cells of a honeycomb: your money, your habits and your goals, side by side.
          </p>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">Product</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#how" className="text-fg-2 hover:text-fg">How it works</Link></li>
            <li><Link href="/#features" className="text-fg-2 hover:text-fg">Features</Link></li>
            <li><Link href="/pricing/" className="text-fg-2 hover:text-fg">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">Account</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a href={SIGN_UP} className="text-fg-2 hover:text-fg">Create an account</a></li>
            <li><a href={SIGN_IN} className="text-fg-2 hover:text-fg">Sign in</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-10 text-xs text-faint">© {new Date().getFullYear()} Hive</div>
    </footer>
  );
}
