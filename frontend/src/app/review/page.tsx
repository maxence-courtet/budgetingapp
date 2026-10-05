"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, TrendingDown, TrendingUp, Link2, CalendarDays, Dumbbell, ChevronRight, Check } from "lucide-react";
import { getWeeklySummary, runWeeklyReview, getPatterns, getNotes } from "@/lib/api";
import { fmt } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

type Week = "current" | "previous";

interface Review {
  headline: string;
  summary: string;
  wins: string[];
  watchouts: string[];
  actionItems: { title: string; area: string }[];
}

interface Pattern {
  id: string;
  kind: "habit-spending" | "workout-spending" | "habit-habit" | "weekday-spending";
  title: string;
  detail: string;
}

const PATTERN_ICON = {
  "habit-spending": TrendingDown,
  "workout-spending": Dumbbell,
  "habit-habit": Link2,
  "weekday-spending": CalendarDays,
};

const shortDate = (d: string) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function Delta({ now, before, invert = false, asPoints = false, partial = false }: { now: number; before: number; invert?: boolean; asPoints?: boolean; partial?: boolean }) {
  if (!before && !now) return null;
  const vs = partial ? "vs the same days last week" : "vs last week";
  if (!asPoints && !before) return <span className="font-mono text-xs text-muted">none {vs.replace("vs ", "")}</span>;
  const diff = asPoints ? (now - before) * 100 : ((now - before) / before) * 100;
  if (Math.abs(diff) < 1) return <span className="font-mono text-xs text-muted">same as {vs.replace("vs ", "")}</span>;
  const good = invert ? diff < 0 : diff > 0;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-xs ${good ? "text-pos" : "text-neg"}`}>
      <Icon size={12} aria-hidden="true" />
      {diff > 0 ? "+" : "−"}
      {Math.abs(Math.round(diff))}
      {asPoints ? " pts" : "%"} {vs}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded-2xl p-5 space-y-3">
      <h2 className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">{title}</h2>
      {children}
    </section>
  );
}

export default function ReviewPage() {
  const [week, setWeek] = useState<Week>("previous");
  const [summary, setSummary] = useState<any>(null);
  const [patterns, setPatterns] = useState<Pattern[] | null>(null);
  const [past, setPast] = useState<any[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [generating, setGenerating] = useState(false);
  const [openPast, setOpenPast] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadPast = useCallback(() => {
    getNotes({ noteType: "REVIEW", limit: "12" }).then((n) => setPast(n ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    getPatterns(90).then((p) => setPatterns(p.patterns)).catch((e) => setError(e.message));
    loadPast();
  }, [loadPast]);

  useEffect(() => {
    setSummary(null);
    setReview(null);
    getWeeklySummary(week).then(setSummary).catch((e) => setError(e.message));
  }, [week]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await runWeeklyReview(week);
      setReview(res.review);
      loadPast();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly review"
        action={
          <div role="group" aria-label="Week" className="flex p-1 rounded-xl bg-surface-2">
            {([
              { id: "previous", label: "Last week" },
              { id: "current", label: "This week so far" },
            ] as const).map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWeek(w.id)}
                aria-pressed={week === w.id}
                className={`h-8 px-3 rounded-lg text-sm font-medium transition-colors ${
                  week === w.id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {!summary ? (
        <LoadingState message="Compiling your week..." />
      ) : (
        <>
          <p className="font-mono text-xs text-muted uppercase tracking-[0.08em]">
            {summary.week.start === summary.week.end
              ? shortDate(summary.week.start)
              : `${shortDate(summary.week.start)} – ${shortDate(summary.week.end)}`}{" "}
            · {summary.week.days} day{summary.week.days > 1 ? "s" : ""}
            {!summary.week.complete && " so far"}
          </p>

          {/* AI review */}
          <section aria-labelledby="ai-review-heading" className={`rounded-2xl p-6 ${review ? "bg-surface border border-line" : "border border-dashed border-line-strong"}`}>
            {!review ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[16rem]">
                  <h2 id="ai-review-heading" className="text-[15px] font-semibold text-fg">Your review</h2>
                  <p className="text-sm text-muted mt-1">
                    Turn this week into a short write-up with wins, watch-outs and three things to do next. It&apos;s saved to your reviews below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generate}
                  disabled={generating}
                  className="flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover disabled:opacity-60"
                >
                  <Sparkles size={16} className={generating ? "animate-pulse" : ""} aria-hidden="true" />
                  {generating ? "Writing your review…" : "Write my review"}
                </button>
              </div>
            ) : (
              <div className="space-y-5" aria-live="polite">
                <div>
                  <p className="font-mono text-[11px] text-accent uppercase tracking-[0.08em]">Your review</p>
                  <h2 id="ai-review-heading" className="text-2xl font-semibold tracking-tight text-fg mt-1">{review.headline}</h2>
                  <p className="text-fg-2 leading-relaxed mt-2 max-w-3xl">{review.summary}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <h3 className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-2">Wins</h3>
                    <ul className="space-y-2 text-sm text-fg-2">
                      {review.wins.map((w, i) => (
                        <li key={i} className="flex gap-2"><Check size={15} className="text-accent shrink-0 mt-0.5" aria-hidden="true" />{w}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-2">Watch out</h3>
                    {review.watchouts.length ? (
                      <ul className="space-y-2 text-sm text-fg-2">
                        {review.watchouts.map((w, i) => <li key={i} className="flex gap-2"><span className="text-neg" aria-hidden="true">!</span>{w}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">Nothing slipping.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-mono text-[11px] text-muted uppercase tracking-[0.08em] mb-2">Next week</h3>
                    <ol className="space-y-2">
                      {review.actionItems.map((a, i) => (
                        <li key={i} className="flex gap-3 rounded-xl bg-surface-2 p-3 text-sm text-fg">
                          <span className="font-mono text-accent">{i + 1}</span>
                          <span className="flex-1">{a.title}</span>
                          <span className="font-mono text-[10px] text-muted uppercase">{a.area}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Week at a glance */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card title="Money">
              <div>
                <p className="font-mono text-2xl text-fg">{summary.money.spending ? `−${fmt(summary.money.spending)}` : "Nothing spent"}</p>
                <Delta now={summary.money.spending} before={summary.money.spendingPreviousWeek} invert partial={!summary.week.complete} />
              </div>
              {summary.money.income > 0 && <p className="text-sm text-muted">Income <span className="font-mono text-pos">+{fmt(summary.money.income)}</span></p>}
              <ul className="space-y-1.5">
                {summary.money.topCategories.map((c: any) => (
                  <li key={c.name} className="flex justify-between text-sm">
                    <span className="text-fg-2 truncate">{c.name}</span>
                    <span className="font-mono text-fg">{fmt(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Habits">
              {summary.habits.completionRate === null ? (
                <p className="text-sm text-muted">No daily habits. <Link href="/habits" className="text-accent font-medium">Add one →</Link></p>
              ) : (
                <>
                  <div>
                    <p className="font-mono text-2xl text-fg">{Math.round(summary.habits.completionRate * 100)}%</p>
                    {summary.habits.completionRatePreviousWeek !== null && (
                      <Delta now={summary.habits.completionRate} before={summary.habits.completionRatePreviousWeek} asPoints partial={!summary.week.complete} />
                    )}
                  </div>
                  <p className="text-sm text-muted">{summary.habits.perfectDays} perfect day{summary.habits.perfectDays === 1 ? "" : "s"}</p>
                  <ul className="space-y-1.5">
                    {summary.habits.perHabit.slice(0, 8).map((h: any) => (
                      <li key={h.name} className="flex justify-between gap-2 text-sm">
                        <span className="text-fg-2 truncate">{h.name}</span>
                        <span className="font-mono text-fg shrink-0">{h.done}/{h.outOf}</span>
                      </li>
                    ))}
                  </ul>
                  {summary.habits.perHabit.length > 8 && (
                    <Link href="/habits" className="text-xs text-accent font-medium">
                      All {summary.habits.perHabit.length} habits →
                    </Link>
                  )}
                </>
              )}
            </Card>

            <Card title="Body">
              {summary.fitness.length === 0 ? (
                <p className="text-sm text-muted">Nothing logged this week. <Link href="/fitness" className="text-accent font-medium">Log →</Link></p>
              ) : (
                <ul className="space-y-2">
                  {summary.fitness.map((f: any) => (
                    <li key={f.type} className="text-sm">
                      <span className="block text-fg-2 capitalize">{f.type.toLowerCase().replace(/_/g, " ")}</span>
                      <span className="font-mono text-fg">
                        {f.entries > 1 && f.first !== f.last
                          ? `${f.first.toLocaleString("en-US")} → ${f.last.toLocaleString("en-US")}`
                          : f.last.toLocaleString("en-US")}{" "}
                        {f.unit}
                      </span>
                      <span className="text-xs text-muted"> · {f.entries} entr{f.entries === 1 ? "y" : "ies"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Goals & journal">
              <ul className="space-y-2">
                {summary.goals.slice(0, 4).map((g: any) => (
                  <li key={g.title} className="text-sm space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-fg-2 truncate">{g.title}</span>
                      {g.progress !== null && <span className="font-mono text-fg shrink-0">{Math.round(g.progress * 100)}%</span>}
                    </div>
                    {g.milestonesCompletedThisWeek.map((m: string) => (
                      <p key={m} className="text-xs text-accent">✓ {m}</p>
                    ))}
                    {g.milestonesDueSoon.map((m: any) => (
                      <p key={m.title} className="text-xs text-muted">Due {shortDate(m.due)} · {m.title}</p>
                    ))}
                  </li>
                ))}
                {summary.goals.length === 0 && <li className="text-sm text-muted">No active goals.</li>}
              </ul>
              <p className="text-sm text-muted pt-2 border-t border-line">
                <span className="font-mono text-fg">{summary.journalEntries}</span> journal entr{summary.journalEntries === 1 ? "y" : "ies"} ·{" "}
                <Link href="/notes?view=journal" className="text-accent font-medium">Write</Link>
              </p>
            </Card>
          </div>
        </>
      )}

      {/* Patterns */}
      <section aria-labelledby="patterns-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 id="patterns-heading" className="text-[15px] font-semibold text-fg">Patterns</h2>
          <span className="text-xs text-muted">Found in your last 90 days. These are links, not proof of cause.</span>
        </div>
        {patterns === null ? (
          <div className="h-24 rounded-2xl bg-surface-2 animate-pulse" aria-hidden="true" />
        ) : patterns.length === 0 ? (
          <p className="text-sm text-muted bg-surface border border-dashed border-line-strong rounded-2xl p-5">
            No clear patterns yet. They appear once there are a few weeks of habits and spending to compare.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {patterns.map((p) => {
              const Icon = PATTERN_ICON[p.kind] ?? Link2;
              return (
                <li key={p.id} className="flex gap-3 bg-surface border border-line rounded-2xl p-4">
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-accent-soft text-accent-strong flex items-center justify-center">
                    <Icon size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-fg leading-snug">{p.title}</span>
                    <span className="block font-mono text-xs text-muted mt-1">{p.detail}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Past reviews */}
      {past.length > 0 && (
        <section aria-labelledby="past-heading" className="space-y-2">
          <h2 id="past-heading" className="text-[15px] font-semibold text-fg">Past reviews</h2>
          <ul className="bg-surface border border-line rounded-2xl divide-y divide-line">
            {past.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setOpenPast(openPast === n.id ? null : n.id)}
                  aria-expanded={openPast === n.id}
                  className="w-full flex items-center gap-2 px-4 h-11 text-sm text-left text-fg hover:bg-surface-2/60"
                >
                  <ChevronRight size={14} className={`text-faint transition-transform ${openPast === n.id ? "rotate-90" : ""}`} aria-hidden="true" />
                  <span className="flex-1">{n.title}</span>
                  {n.source === "MCP" && <span className="font-mono text-[10px] text-muted uppercase">via Claude</span>}
                </button>
                {openPast === n.id && (
                  <div className="px-10 pb-4 text-sm text-fg-2 whitespace-pre-wrap leading-relaxed">{n.content}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
