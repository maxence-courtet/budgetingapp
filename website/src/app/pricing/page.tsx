import type { Metadata } from "next";
import { Server, Sparkles, HeartHandshake } from "lucide-react";
import { Comparison, PricingPlans } from "@/components/PricingPlans";
import { SIGN_UP } from "@/lib/links";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Hive is free for tracking your money. Plus adds habits, goals and AI for CHF 4 a month; Pro raises the AI limits.",
};

const WHY = [
  {
    icon: Server,
    title: "Money tracking is free",
    text: "Logging transactions and seeing your month costs us little to run, so it stays free with no time limit and no cap on transactions.",
  },
  {
    icon: Sparkles,
    title: "AI is what costs money",
    text: "Every AI analysis is a paid request to a model provider. Daily limits keep Plus at the price of a coffee a month; Pro raises them for heavy use.",
  },
  {
    icon: HeartHandshake,
    title: "You're the customer",
    text: "No ads and no selling data: subscriptions pay for hosting, AI and new modules. Yearly billing gives you two months free.",
  },
];

const FAQ = [
  {
    q: "Can I use Hive for free forever?",
    a: "Yes. The Free plan has no time limit: unlimited accounts and transactions, monthly view, reports and one budget template.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Nothing is deleted. Modules that aren't in your plan are hidden until you upgrade again, with your habits, goals and notes intact.",
  },
  {
    q: "Do the AI limits reset?",
    a: "Yes, every day. A failed analysis doesn't count towards your limit.",
  },
  {
    q: "What is 'connect your AI assistant'?",
    a: "Hive speaks MCP, the standard AI assistants use for tools. Add Hive as a connector in Claude, ChatGPT or another MCP assistant, sign in, and it can read and add to your Hive, only for your account.",
  },
  {
    q: "Which currency and how do I pay?",
    a: "Prices are in Swiss francs. Paid plans are opening soon: create a free account now and you can upgrade from the app as soon as they launch.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Monthly plans stop at the end of the month; yearly plans run until the end of the year you paid for.",
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
            <h1 className="text-balance mt-3 text-[40px] leading-[1.05] sm:text-6xl font-semibold tracking-[-0.035em]">Simple plans. Start for free.</h1>
            <p className="mt-5 text-lg text-muted">
              Track your money for free. Upgrade when you want your habits, goals and an AI that knows your numbers.
            </p>
          </div>
          <div className="mt-10">
            <PricingPlans />
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Paid plans open soon. Start free now and upgrade from the app when they do.
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
            Start free
          </a>
        </div>
      </section>
    </>
  );
}
