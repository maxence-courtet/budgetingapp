import type { Metadata } from "next";
import { Server, Sparkles, HeartHandshake } from "lucide-react";
import { Comparison, PricingPlans } from "@/components/PricingPlans";
import { SIGN_UP } from "@/lib/links";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Try Hive free for a month. Then Plus is CHF 4 a month for money, habits, goals and your AI assistant; Pro adds tokens for automations."
};

const WHY = [
  {
    icon: Server,
    title: "Try everything first",
    text: "Your first month includes every module, with no payment details. Nothing renews or charges on its own: when the month ends, you decide.",
  },
  {
    icon: Sparkles,
    title: "A fair, flat price",
    text: "Plus costs about the price of one coffee a month and covers hosting, backups and the modules we build next. Yearly billing gives you two months free.",
  },
  {
    icon: HeartHandshake,
    title: "You're the customer",
    text: "No ads, no selling data, no free tier paid for by your attention. Your data stays yours: export it or delete it whenever you like.",
  },
];

const FAQ = [
  {
    q: "How does the free month work?",
    a: "Create an account and use all of Hive Plus for 30 days, with no card needed. You'll see how many days are left in Settings and a reminder in the last week. Nothing is charged automatically.",
  },
  {
    q: "What happens when the free month ends?",
    a: "You choose Plus or Pro to keep going. Until you do, the app is paused, but nothing is deleted: you can still download all your data or delete your account from Settings.",
  },
  {
    q: "What is 'connect your AI assistant'?",
    a: "Hive speaks MCP, the standard AI assistants use for tools. Add Hive as a connector in Claude, ChatGPT or another MCP assistant, sign in, and it can read and add to your Hive, only for your account. See the step-by-step guide.",
  },
  {
    q: "Which currency and how do I pay?",
    a: "Prices are in Swiss francs. Online payment is opening soon; until then, start your free month and we'll let you know when you can choose a plan in the app.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Monthly plans stop at the end of the month; yearly plans run until the end of the year you paid for. Your data stays available to export.",
  },
  {
    q: "Can I get my data out, or have it deleted?",
    a: "Yes, any time: Settings → Your data lets you download everything as a file and delete your account and all its data for good.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="text-center max-w-2xl mx-auto">
            <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.14em] text-accent-text">Pricing</p>
            <h1 className="text-balance mt-3 text-[40px] leading-[1.05] sm:text-6xl font-semibold tracking-[-0.035em]">One month free. Then two simple plans.</h1>
            <p className="mt-5 text-lg text-muted">
              Everything included for your first month, no card needed. Then keep your money, habits, goals and your own AI assistant in one place.
            </p>
          </div>
          <div className="mt-10">
            <PricingPlans />
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            No card needed for the free month, and nothing is charged automatically. Online payment is opening soon.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 sm:pb-28">
        <h2 className="text-2xl sm:text-4xl font-semibold tracking-[-0.025em] mb-8">Compare every feature</h2>
        <Comparison />
      </section>

      <section className="bg-surface border-y border-line">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.14em] text-accent-text">Why these prices</p>
            <h2 className="text-balance mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">What you pay for, and why.</h2>
          </div>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {WHY.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-3xl border border-line bg-canvas p-6 sm:p-7">
                <span className="w-11 h-11 rounded-2xl bg-accent-soft flex items-center justify-center">
                  <Icon size={20} className="text-accent-text" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-[15px] text-muted leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-28">
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">Questions</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex items-start justify-between gap-6 cursor-pointer list-none text-lg font-medium">
                {q}
                <span className="mt-1 text-muted text-xl leading-none transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] text-muted leading-relaxed pr-8">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-14 text-center">
          <a
            href={SIGN_UP}
            className="h-12 px-7 inline-flex items-center justify-center rounded-xl bg-accent text-accent-ink font-semibold hover:brightness-95"
          >
            Start your free month
          </a>
        </div>
      </section>
    </>
  );
}
