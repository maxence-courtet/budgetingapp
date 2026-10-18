import type { Metadata } from "next";
import { Check, Plug } from "lucide-react";
import { Browser, Phone } from "@/components/Frames";
import { Eyebrow, PageEnd, PageIntro } from "@/components/Marketing";

export const metadata: Metadata = {
  title: "Features",
  description: "Months, reports with a spending ring, budget templates, habits and goals, and your own AI assistant connected to Hive.",
};

export default function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Features"
        title="Everything in one calm place."
        text="Your months, where the money went, the plan behind it, and the parts of life you want to track next to it."
      />
      <Features />
      <PageEnd next={{ href: "/privacy/", label: "How we handle your data" }} />
    </>
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
    <div id={eyebrow.toLowerCase().replace(/ /g, "-")} className="scroll-mt-24 grid items-center gap-10 md:gap-16 md:grid-cols-2">
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
    <section className="bg-surface border-y border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 space-y-20 sm:space-y-32">
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
          eyebrow="Assistants"
          title="Works with the AI you already use"
          text="Connect Claude, ChatGPT or any assistant that supports MCP, and ask it about your money in plain words. It reads and adds to your Hive, and only ever sees your own data."
          points={["Ask questions about any month, category or goal", "Add transactions or log a habit from a chat", "Revoke an assistant's access any time in Settings"]}
          visual={<AssistantMock />}
        />
      </div>
    </section>
  );
}

function AssistantMock() {
  return (
    <div
      className="rounded-3xl border border-line bg-canvas p-4 sm:p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.35)]"
      aria-label="Example of a conversation with an AI assistant connected to Hive"
    >
      <div className="flex items-center gap-2 pb-4 border-b border-line">
        <span className="w-8 h-8 rounded-lg bg-accent-soft flex items-center justify-center">
          <Plug size={15} className="text-accent-text" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold">Your assistant</p>
        <span className="ml-auto h-6 px-2 inline-flex items-center rounded-md bg-surface border border-line text-[11px] font-mono text-muted">
          Hive connected
        </span>
      </div>
      <div className="mt-4 space-y-3 text-[15px]">
        <p className="ml-auto max-w-[85%] w-fit rounded-2xl rounded-br-md bg-accent text-accent-ink px-4 py-2.5">
          How much did I spend eating out last month?
        </p>
        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-surface border border-line px-4 py-3 text-fg-2">
          <p>
            <span className="font-semibold text-fg">$570</span> across 6 visits in September, $330 over your plan of $240. Pizza
            night and sushi were the biggest.
          </p>
        </div>
        <p className="ml-auto max-w-[85%] w-fit rounded-2xl rounded-br-md bg-accent text-accent-ink px-4 py-2.5">
          Log $18 for lunch today.
        </p>
        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-surface border border-line px-4 py-3 text-fg-2 flex items-center gap-2">
          <Check size={16} className="text-accent-text shrink-0" aria-hidden="true" />
          Added to October under Dining out.
        </div>
      </div>
      <p className="mt-4 text-[11px] text-faint">An example conversation; answers come from your own Hive data.</p>
    </div>
  );
}

