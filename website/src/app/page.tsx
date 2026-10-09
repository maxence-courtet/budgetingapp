import Link from "next/link";
import { ArrowRight, Check, LucideIcon, Lock, PieChart, Plug, Repeat, Sparkles } from "lucide-react";
import { Browser, Phone } from "@/components/Frames";
import { Eyebrow, PageEnd } from "@/components/Marketing";
import { SIGN_UP } from "@/lib/links";
import { PLANS } from "@/lib/plans";

export default function Home() {
  return (
    <>
      <Hero />
      <SellingPoints />
      <PricingTeaser />
      <PageEnd next={{ href: "/how-it-works/", label: "How it works" }} />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-20 pb-12 sm:pb-24">
        <div className="max-w-3xl rise">
          <a
            href={SIGN_UP}
            className="inline-flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-full border border-line bg-surface text-xs sm:text-sm font-medium text-fg-2 hover:border-line-strong"
          >
            <span className="h-5 px-2 inline-flex items-center rounded-full bg-accent text-accent-ink text-[11px] font-semibold">1 month free</span>
            No card needed to start
            <ArrowRight size={14} aria-hidden="true" />
          </a>
          <h1 className="mt-6 text-[42px] leading-[1.02] sm:text-6xl lg:text-7xl font-semibold tracking-[-0.035em]">
            Your money and the rest of your life,{" "}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10">side by side.</span>
              <span className="absolute left-0 right-0 bottom-[0.08em] h-[0.28em] bg-accent/70 -z-0 rounded-sm" aria-hidden="true" />
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl leading-relaxed">
            Track what you earn, spend and save, month by month. Add habits and goals when you&apos;re ready.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href={SIGN_UP}
              className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-ink font-semibold hover:brightness-95"
            >
              Start your free month <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link
              href="/pricing/"
              className="h-12 px-6 inline-flex items-center justify-center rounded-xl border border-line-strong bg-surface font-medium hover:border-fg-2"
            >
              See pricing
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {["First month free, no card", "Phone and desktop", "Your data stays yours"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-accent-text" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop: the app in a browser with a phone in front. Phones: two phones. */}
        <div className="relative mt-10 sm:mt-20 rise" style={{ animationDelay: "120ms" }}>
          <div className="hidden md:block pl-[12%]">
            <Browser name="home" alt="Hive on a computer: net worth, this month in and out, and its chart over the year" priority />
          </div>
          <Phone
            name="reports"
            alt="Hive on a phone: a ring showing where the month's money went"
            priority
            className="hidden md:block absolute left-0 bottom-[-5%] w-[20%] max-w-[230px]"
          />
          <div className="md:hidden mx-auto w-[62%] max-w-[260px]">
            <Phone name="reports" alt="Hive on a phone: where the month's money went" priority />
          </div>
        </div>
      </div>
    </section>
  );
}

const POINTS: { icon: LucideIcon; title: string; text: string; href: string }[] = [
  { icon: Repeat, title: "Plan once", text: "Describe a typical month, then see every month against it.", href: "/features/#budget-templates" },
  { icon: PieChart, title: "See where it went", text: "A ring per month, savings and investments included.", href: "/features/#reports" },
  { icon: Sparkles, title: "More than money", text: "Habits, goals, fitness and notes, only if you want them.", href: "/features/#life" },
  { icon: Plug, title: "Works with your AI", text: "Ask Claude or ChatGPT about your money.", href: "/connect/" },
  { icon: Lock, title: "Private by design", text: "No ads, no trackers. Export or delete any time.", href: "/privacy/" },
];

function SellingPoints() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
      <Eyebrow>Why Hive</Eyebrow>
      <ul className="mt-5 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {POINTS.map(({ icon: Icon, title, text, href }) => (
          <li key={title}>
            <Link href={href} className="group h-full flex sm:flex-col gap-4 sm:gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5 hover:border-line-strong">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-accent-soft flex items-center justify-center">
                <Icon size={18} className="text-accent-text" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-semibold">
                  {title}
                  <ArrowRight size={14} className="text-faint group-hover:text-accent-text transition-colors" aria-hidden="true" />
                </span>
                <span className="mt-1 block text-sm text-muted leading-relaxed">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PricingTeaser() {
  return (
    <section className="bg-surface border-y border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-xl">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="text-balance mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">One month free. Then a fair price.</h2>
          </div>
          <Link href="/pricing/" className="inline-flex items-center gap-2 font-medium text-accent-text hover:underline">
            Compare plans <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
            <li
              key={p.id}
              className={`rounded-3xl p-6 border ${p.highlight ? "border-accent bg-accent-soft" : "border-line bg-canvas"}`}
            >
              <p className="font-semibold">{p.name}</p>
              <p className="mt-3">
                <span className="text-4xl font-semibold tracking-tight">CHF {p.monthly}</span>
                <span className="text-muted"> / month after your free month</span>
              </p>
              <p className="mt-2 text-sm text-muted">{p.tagline}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

