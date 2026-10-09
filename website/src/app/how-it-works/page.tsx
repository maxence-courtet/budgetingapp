import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageEnd, PageIntro } from "@/components/Marketing";

export const metadata: Metadata = {
  title: "How it works",
  description: "Set up your accounts and a typical month once, log as you go, and see every month against your plan.",
};

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title="Three habits, and the numbers take care of themselves."
        text="Hive is built around a simple monthly rhythm: plan a typical month once, log what happens, and look back at the end."
      />
      <HowItWorks />
      <PageEnd next={{ href: "/features/", label: "See the features" }} />
    </>
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
    text: "Each month gets a ring of where the money went, spending and transfers alike. Your net worth builds into a chart you'll want to keep growing.",
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
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
      <ol className="mt-6 grid gap-4 md:grid-cols-3">
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

