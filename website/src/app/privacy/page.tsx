import type { Metadata } from "next";
import Link from "next/link";
import { Ban, EyeOff, Lock, LucideIcon } from "lucide-react";
import { PageEnd, PageIntro } from "@/components/Marketing";

export const metadata: Metadata = {
  title: "Privacy",
  description: "No ads, no trackers, only your own data for your assistants. Export or delete everything whenever you like.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        eyebrow="Privacy"
        title="Your finances are personal. Hive treats them that way."
        text="Hive is paid for by subscriptions, so there is no reason to look at, sell or share your data."
      />
      <Privacy />
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24 -mt-6">
        <p className="text-muted">
          The details are in our <Link href="/legal/privacy/" className="text-accent-text underline">privacy policy</Link>.
        </p>
      </section>
      <PageEnd next={{ href: "/pricing/", label: "See pricing" }} />
    </>
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
    title: "Nothing in the background",
    text: "Hive doesn't send your data anywhere on its own. An assistant only sees it when you connect one, and you can disconnect it any time.",
  },
  {
    icon: Ban,
    title: "No ads, ever",
    text: "Hive is paid for by subscriptions, not by your attention or your data. Export or delete everything whenever you like.",
  },
];

function Privacy() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
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

