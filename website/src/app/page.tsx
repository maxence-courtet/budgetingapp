import Link from "next/link";
import {
  ArrowRight,
  Check,
  Plus,
  Sparkles,
  Lock,
  Ban,
  EyeOff,
  Plug,
  LucideIcon,
} from "lucide-react";
import { Browser, Phone } from "@/components/Frames";
import { SIGN_UP } from "@/lib/links";
import { PLANS } from "@/lib/plans";

export default function Home() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Features />
      <Privacy />
      <PricingTeaser />
      <FinalCta />
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] sm:text-xs uppercase tracking-[0.14em] text-accent-text">{children}</p>;
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 sm:pt-20 pb-16 sm:pb-24">
        <div className="max-w-3xl rise">
          <a
            href={SIGN_UP}
            className="inline-flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-full border border-line bg-surface text-xs sm:text-sm font-medium text-fg-2 hover:border-line-strong"
          >
            <span className="h-5 px-2 inline-flex items-center rounded-full bg-accent text-accent-ink text-[11px] font-semibold">Free</span>
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
            Hive is a calm place to track what you earn, spend and save, month by month. Add habits and goals when
            you&apos;re ready, and ask an AI that actually knows your numbers what to do next.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href={SIGN_UP}
              className="h-12 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-ink font-semibold hover:brightness-95"
            >
              Start free <ArrowRight size={18} aria-hidden="true" />
            </a>
            <Link
              href="/pricing/"
              className="h-12 px-6 inline-flex items-center justify-center rounded-xl border border-line-strong bg-surface font-medium hover:border-fg-2"
            >
              See pricing
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
            {["Free plan, no time limit", "Phone and desktop", "Your data stays yours"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check size={15} className="text-accent-text" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Desktop: the app in a browser with a phone in front. Phones: two phones. */}
        <div className="relative mt-14 sm:mt-20 rise" style={{ animationDelay: "120ms" }}>
          <div className="hidden md:block pl-[12%]">
            <Browser name="home" alt="Hive on a computer: net worth, its chart over the year, and next moves" priority />
          </div>
          <Phone
            name="reports"
            alt="Hive on a phone: a ring showing where the month's money went"
            priority
            className="hidden md:block absolute left-0 bottom-[-5%] w-[20%] max-w-[230px]"
          />
          <div className="md:hidden grid grid-cols-2 gap-4 items-start">
            <Phone name="home" alt="Hive on a phone: net worth and its chart" priority />
            <Phone name="reports" alt="Hive on a phone: where the month's money went" priority className="mt-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Set it up once",
    text: "Add your accounts and categories, then describe a typical month as a budget template: salary in, rent and groceries out, savings moved aside.",
    visual: (
      <div className="space-y-2" aria-hidden="true">
        {[
          ["Salary", "+6,400", "text-accent-text"],
          ["Rent", "−1,850", "text-fg"],
          ["To savings", "800", "text-muted"],
        ].map(([a, b, c]) => (
          <div key={a} className="flex items-center justify-between h-9 px-3 rounded-lg bg-canvas border border-line text-sm">
            <span>{a}</span>
            <span className={`font-mono ${c}`}>{b}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Log it in seconds",
    text: "Tap + from anywhere, type the amount, pick a category. Hive files it into the right month, and you tick off planned items as they're paid.",
    visual: (
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="w-12 h-12 rounded-2xl bg-accent text-accent-ink flex items-center justify-center shadow-lg shadow-black/10">
          <Plus size={22} strokeWidth={2.4} />
        </span>
        <div className="flex-1 h-12 px-3 rounded-xl bg-canvas border border-line flex items-center justify-between text-sm">
          <span>Dining out</span>
          <span className="font-mono">−42.50</span>
        </div>
      </div>
    ),
  },
  {
    title: "See where it goes",
    text: "Each month gets a ring of where the money went, spending and transfers alike. Your net worth builds into a chart, and AI points out what's worth doing next.",
    visual: (
      <svg viewBox="0 0 120 64" className="w-full h-16" aria-hidden="true">
        <g transform="translate(32 32) rotate(-90)">
          {[
            ["#2a78d6", 0, 30],
            ["#eb6834", 31, 22],
            ["#1baf7a", 54, 16],
            ["#eda100", 71, 12],
            ["#a9a8a2", 84, 15],
          ].map(([c, start, len]) => (
            <circle
              key={String(c)}
              r="22"
              fill="none"
              stroke={String(c)}
              strokeWidth="9"
              pathLength="100"
              strokeDasharray={`${len} ${100 - Number(len)}`}
              strokeDashoffset={-Number(start)}
            />
          ))}
        </g>
        <polyline points="68,50 78,42 88,44 98,30 108,24 116,14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-text" />
      </svg>
    ),
  },
];

function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="text-balance mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">Three habits, and the numbers take care of themselves.</h2>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-3xl border border-line bg-surface p-6 sm:p-7 flex flex-col">
            <span className="font-mono text-sm text-faint">0{i + 1}</span>
            <h3 className="mt-2 text-xl font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-[15px] text-muted leading-relaxed">{s.text}</p>
            <div className="mt-auto pt-6">{s.visual}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  text,
  points,
  visual,
  flip,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: string[];
  visual: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 md:gap-16 md:grid-cols-2">
      <div className={flip ? "md:order-2" : ""}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-[-0.025em]">{title}</h3>
        <p className="mt-4 text-[17px] text-muted leading-relaxed">{text}</p>
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3 text-[15px] text-fg-2">
              <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-accent-soft flex items-center justify-center">
                <Check size={12} strokeWidth={3} className="text-accent-text" aria-hidden="true" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? "md:order-1" : ""}>{visual}</div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-surface border-y border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28 space-y-24 sm:space-y-32">
        <FeatureRow
          eyebrow="Months"
          title="Every month, at a glance"
          text="Money in, money out and what's left, against what you planned. Tap any transaction to fix it; the month keeps itself tidy."
          points={["Planned vs. paid for income and spending", "Budget lines and one-off spending, side by side", "Search every transaction you've ever logged"]}
          visual={
            <div className="mx-auto w-[72%] max-w-[300px]">
              <Phone name="month" alt="A month in Hive: money in, out and net, then the month's transactions" />
            </div>
          }
        />
        <FeatureRow
          flip
          eyebrow="Reports"
          title="See where it actually went"
          text="A ring for every month shows the categories that took the most, and the money you moved to savings or investments, so a good month looks like one."
          points={["Top categories at a glance, the rest one tap away", "Transfers to savings and investments, not just spending", "Balances per account and category"]}
          visual={
            <div className="mx-auto w-[72%] max-w-[300px]">
              <Phone name="reports" alt="The spending ring in Hive's monthly report" />
            </div>
          }
        />
        <FeatureRow
          eyebrow="Budget templates"
          title="Plan a typical month once"
          text="Describe your usual month (salary, rent, insurance, what you put aside) and apply it to any month in one tap. The plan's own ring shows where it sends your money."
          points={["Income, spending and transfers between accounts", "See each account's monthly impact", "Apply to a month and tick items off as they're paid"]}
          visual={<Browser name="budget" alt="A budget template in Hive with its planned-spending ring" />}
        />
        <FeatureRow
          flip
          eyebrow="Life"
          title="More than money, when you want it"
          text="Turn on the modules that matter to you: habits with streaks, a fitness log, goals with milestones, notes and a daily journal. Hide the rest; Hive stays as simple as you need."
          points={["Choose your modules in a short welcome tour", "Check in a habit from your phone in one tap", "A weekly review that ties money and habits together"]}
          visual={
            <div className="mx-auto grid grid-cols-2 gap-4 max-w-[480px]">
              <Phone name="habits" alt="Habits in Hive with streaks and the last seven days" />
              <Phone name="goals" alt="Goals in Hive with progress and milestones" className="mt-12" />
            </div>
          }
        />
        <FeatureRow
          eyebrow="AI"
          title="An assistant that knows your numbers"
          text="Ask for your next moves and Hive's AI reads your month, habits and goals, then ranks the three things most worth doing. Or connect the assistant you already use."
          points={["Next moves and a weekly review, only when you ask", "Connect Claude, ChatGPT or any MCP assistant", "Assistants only ever see your own data"]}
          visual={<AiMock />}
        />
      </div>
    </section>
  );
}

function AiMock() {
  const moves = [
    ["Highest impact", "Dining out is 30% over plan with a week left. Cap it at CHF 60."],
    ["Next", "Move CHF 300 to savings to stay on your emergency-fund goal."],
    ["Next", "You've run 3 times this week. One more keeps the streak."],
  ];
  return (
    <div className="rounded-3xl border border-line bg-canvas p-4 sm:p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]" aria-label="Example of AI next moves">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Next moves</p>
        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-line-strong text-xs font-medium">
          <Sparkles size={13} aria-hidden="true" /> Refresh
        </span>
      </div>
      <ol className="mt-4 grid gap-3">
        {moves.map(([label, text], i) => (
          <li
            key={i}
            className={`rounded-2xl p-4 ${i === 0 ? "bg-accent text-accent-ink" : "bg-surface border border-line text-fg"}`}
          >
            <p className="flex justify-between font-mono text-[10px] uppercase tracking-[0.08em] opacity-75">
              <span>{label}</span>
              <span>{i + 1}</span>
            </p>
            <p className="mt-2 text-[15px] font-semibold leading-snug">{text}</p>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-line-strong p-4">
        <span className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
          <Plug size={18} className="text-accent-text" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted">
          <span className="font-medium text-fg">Bring your own assistant.</span> Add Hive as a connector and ask
          &ldquo;how much did I spend on food this year?&rdquo; from your favourite AI.
        </p>
      </div>
      <p className="mt-3 text-[11px] text-faint">Example suggestions; yours are based on your own data.</p>
    </div>
  );
}

const PRIVACY: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Lock,
    title: "Only yours",
    text: "Every request is tied to your account. Connected assistants get their own revocable access and can only see your data.",
  },
  {
    icon: EyeOff,
    title: "AI when you ask",
    text: "Nothing is sent to an AI in the background. Analyses run when you press the button, with a daily limit you can see.",
  },
  {
    icon: Ban,
    title: "No ads, ever",
    text: "Hive is paid for by subscriptions, not by your attention or your data. The free plan stays free.",
  },
];

function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-20 mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-2xl">
        <Eyebrow>Privacy</Eyebrow>
        <h2 className="text-balance mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">Your finances are personal. Hive treats them that way.</h2>
      </div>
      <ul className="mt-12 grid gap-4 md:grid-cols-3">
        {PRIVACY.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
            <span className="w-11 h-11 rounded-2xl bg-accent-soft flex items-center justify-center">
              <Icon size={20} className="text-accent-text" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-[15px] text-muted leading-relaxed">{text}</p>
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
            <h2 className="text-balance mt-3 text-3xl sm:text-5xl font-semibold tracking-[-0.03em]">Free to start. Fair when you grow.</h2>
          </div>
          <Link href="/pricing/" className="inline-flex items-center gap-2 font-medium text-accent-text hover:underline">
            Compare plans <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <li
              key={p.id}
              className={`rounded-3xl p-6 border ${p.highlight ? "border-accent bg-accent-soft" : "border-line bg-canvas"}`}
            >
              <p className="font-semibold">{p.name}</p>
              <p className="mt-3">
                <span className="text-4xl font-semibold tracking-tight">{p.monthly === 0 ? "CHF 0" : `CHF ${p.monthly}`}</span>
                <span className="text-muted"> / month</span>
              </p>
              <p className="mt-2 text-sm text-muted">{p.tagline}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div className="honeycomb absolute inset-0 -z-10" aria-hidden="true" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-24 sm:py-32 text-center">
        <h2 className="text-4xl sm:text-6xl font-semibold tracking-[-0.035em]">Start your hive today.</h2>
        <p className="mt-5 text-lg text-muted">
          Create an account in a minute. A short tour shows you around, and you choose what Hive shows.
        </p>
        <a
          href={SIGN_UP}
          className="mt-8 h-12 px-7 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-ink font-semibold hover:brightness-95"
        >
          Start free <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
