"use client";

import { localISO } from "@/lib/date";
import { useState, useEffect } from "react";
import Link from "next/link";
import { getAccounts, getMonths, getTransactions, getHabits, getAllHabitLogs, logHabit, getGoals, getNetWorthHistory } from "@/lib/api";
import { doneDatesByHabit, habitStats, addDays } from "@/lib/habitStats";
import { goalProgress, isDecreasing, fmtNum } from "@/lib/goals";
import { fmt } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { NetWorthChart } from "@/components/NetWorthChart";
import { TRANSACTIONS_CHANGED, openQuickAdd } from "@/components/QuickAddTransaction";
import { TransactionList } from "@/components/TransactionList";
import { usePreferences } from "@/components/PreferencesProvider";
import { Account, Month, Transaction } from "@/lib/types";
import { Plus, Check, ArrowRight } from "lucide-react";

interface HabitRow {
  id: string;
  name: string;
  frequency: string;
  active: boolean;
  createdAt?: string;
  done: Set<string>;
}

interface Goal {
  id: string;
  title: string;
  status: string;
  unit: string | null;
  currentValue: number | null;
  targetValue: number | null;
  startValue?: number | null;
}

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
}

const LAST_7 = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i));
const TODAY = LAST_7[6];

function signed(n: number) {
  return (n < 0 ? "−" : "") + fmt(n);
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [months, setMonths] = useState<Month[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [netWorth, setNetWorth] = useState<{ cash: number; investments: number; total: number } | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { modules } = usePreferences();
  const showHabits = modules.includes("habits");
  const showGoals = modules.includes("goals");

  useEffect(() => {
    async function load() {
      try {
        const [accts, mos, txns, habitList, goalList, nw] = await Promise.all([
          getAccounts(),
          getMonths(),
          // Recent activity: nothing dated in the future
          getTransactions({ limit: "8", sort: "date:desc", until: TODAY }),
          getHabits(),
          getGoals(),
          getNetWorthHistory(2).catch(() => null),
        ]);
        setNetWorth(Array.isArray(nw) && nw.length ? nw[nw.length - 1] : null);
        setAccounts(accts);
        setMonths(mos);
        setTransactions(Array.isArray(txns) ? txns : txns.data ?? []);
        setGoals((goalList ?? []).filter((g: Goal) => g.status === "ACTIVE").slice(0, 4));
        const active = (habitList ?? []).filter((h: any) => h.active !== false).slice(0, 6);
        const logs = await getAllHabitLogs({ dateFrom: addDays(TODAY, -400), dateTo: TODAY }).catch(() => []);
        const done = doneDatesByHabit((logs ?? []).map((l: any) => ({ ...l, date: l.date.slice(0, 10) })));
        const rows: HabitRow[] = active.map((h: any) => ({ ...h, done: done.get(h.id) ?? new Set<string>() }));
        setHabits(rows);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.addEventListener(TRANSACTIONS_CHANGED, load);
    return () => window.removeEventListener(TRANSACTIONS_CHANGED, load);
  }, []);

  async function checkIn(habit: HabitRow) {
    setCheckingIn(habit.id);
    try {
      await logHabit(habit.id, { date: TODAY, completed: true });
      setHabits((hs) =>
        hs.map((h) => (h.id === habit.id ? { ...h, done: new Set([...h.done, TODAY]) } : h))
      );
    } catch (e: any) {
      setError(`Couldn't check in “${habit.name}”: ${e.message}`);
    } finally {
      setCheckingIn(null);
    }
  }

  if (loading) return <LoadingState message="Loading dashboard..." />;

  const cashTotal = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  // Same figure as the chart's latest point: cash plus investments.
  const totalBalance = netWorth ? netWorth.total : cashTotal;
  const now = new Date();
  const currentMonth = months.find(
    (m) => m.month === now.getMonth() + 1 && m.year === now.getFullYear()
  );
  const income = currentMonth?.income ?? 0;
  const spending = currentMonth?.spending ?? 0;
  const savedRate = income > 0 ? ((income - spending) / income) * 100 : null;
  const today = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <h1 className="sr-only">Dashboard</h1>
      <section aria-label="Overview" className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-2">
          <p className="font-mono text-xs text-muted uppercase tracking-[0.08em]">{today} · Net worth</p>
          <p className="font-mono text-[44px] sm:text-5xl md:text-6xl font-medium tracking-[-0.04em] leading-none text-fg">
            {signed(totalBalance)}
          </p>
          <p className="text-sm text-muted">
            {netWorth && netWorth.investments > 0
              ? `${signed(cashTotal)} cash · ${signed(netWorth.investments)} investments`
              : `across ${accounts.length} account${accounts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {currentMonth ? (
          <Link
            href={`/months/${currentMonth.id}`}
            className="group flex flex-wrap gap-7 rounded-xl px-1 py-1"
            aria-label={`${MONTH_NAMES[currentMonth.month - 1]} details`}
          >
            <Stat label={`In · ${MONTH_NAMES[currentMonth.month - 1].slice(0, 3)}`} value={`+${fmt(income)}`} tone="text-pos" />
            <Stat label={`Out · ${MONTH_NAMES[currentMonth.month - 1].slice(0, 3)}`} value={`−${fmt(spending)}`} tone="text-neg" />
            <Stat label="Saved rate" value={savedRate === null ? "—" : `${savedRate.toFixed(1)}%`} tone="text-fg" />
            <ArrowRight size={16} className="self-center text-faint group-hover:text-accent transition-colors" aria-hidden="true" />
          </Link>
        ) : (
          <Link
            href="/months"
            className="flex items-center gap-2 h-11 px-4 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            <Plus size={15} aria-hidden="true" />
            Start {MONTH_NAMES[now.getMonth()]}
          </Link>
        )}
      </section>

      <NetWorthChart />

      {(showHabits || showGoals) && (
      <div className={`grid grid-cols-1 gap-4 ${showHabits && showGoals ? "lg:grid-cols-2" : ""}`}>
        {showHabits && (
        <section aria-labelledby="habits-heading" className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <CardHeader id="habits-heading" title="Habits · last 7 days" href="/habits" />
          {habits.length === 0 ? (
            <p className="text-sm text-muted">No active habits. <Link href="/habits" className="text-accent font-medium">Create one →</Link></p>
          ) : (
            <ul className="space-y-3">
              {habits.map((h) => {
                const doneToday = h.done.has(TODAY);
                return (
                  <li key={h.id} className="flex items-center gap-3">
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-fg">{h.name}</span>
                    <span className="flex gap-1" aria-label={`${LAST_7.filter((d) => h.done.has(d)).length} of the last 7 days`}>
                      {LAST_7.map((d) => (
                        <span
                          key={d}
                          className={`block w-[18px] h-[18px] rounded-[5px] ${h.done.has(d) ? "bg-accent" : "bg-surface-2"}`}
                        />
                      ))}
                    </span>
                    <button
                      type="button"
                      onClick={() => checkIn(h)}
                      disabled={doneToday || checkingIn === h.id}
                      aria-label={doneToday ? `${h.name} done today` : `Check in ${h.name} for today`}
                      className={`flex items-center justify-center gap-1 w-16 h-8 rounded-lg font-mono text-xs transition-colors ${
                        doneToday
                          ? "bg-accent-soft text-accent-strong"
                          : "border border-line-strong text-fg hover:border-accent hover:text-accent"
                      }`}
                    >
                      {doneToday ? <><Check size={13} aria-hidden="true" />{habitStats(h, h.done, TODAY).current}{h.frequency === "WEEKLY" ? "w" : "d"}</> : "Check"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        )}

        {showGoals && (
        <section aria-labelledby="goals-heading" className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <CardHeader id="goals-heading" title="Goals" href="/goals" />
          {goals.length === 0 ? (
            <p className="text-sm text-muted">No active goals. <Link href="/goals" className="text-accent font-medium">Set one →</Link></p>
          ) : (
            <ul className="space-y-4">
              {goals.map((g) => {
                const pct = g.targetValue != null ? goalProgress(g).pct : 0;
                return (
                  <li key={g.id} className="space-y-2">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-medium text-fg truncate">{g.title}</span>
                      <span className="font-mono text-xs text-muted shrink-0">
                        {g.targetValue == null
                          ? "No target"
                          : isDecreasing(g)
                          ? `${fmtNum(g.currentValue)} → ${fmtNum(g.targetValue)}${g.unit ? ` ${g.unit}` : ""}`
                          : `${fmtNum(g.currentValue)} / ${fmtNum(g.targetValue)}${g.unit ? ` ${g.unit}` : ""}`}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={g.title}>
                      <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        )}
      </div>
      )}

      <section aria-labelledby="accounts-heading" className="space-y-3">
        <CardHeader id="accounts-heading" title="Accounts" href="/accounts" linkLabel="Manage" />
        {accounts.length === 0 ? (
          <EmptyState
            message="No accounts yet."
            cta={{ label: "Create your first account", onClick: () => (window.location.href = "/accounts") }}
          />
        ) : (
          <ul role="list" className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden sm:bg-transparent sm:border-0 sm:rounded-none sm:divide-y-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
            {accounts.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/accounts/${a.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 sm:block sm:h-full sm:bg-surface sm:border sm:border-line sm:rounded-2xl sm:p-4 hover:bg-surface-2 sm:hover:bg-surface sm:hover:border-accent transition-colors"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] sm:text-[11px] text-muted uppercase tracking-[0.08em]">
                      {a.type?.replace("_", " ") ?? "Account"}
                    </span>
                    <span className="block text-sm font-medium text-fg sm:mt-1 truncate">{a.name}</span>
                  </span>
                  <span className={`block font-mono text-[15px] sm:text-xl sm:mt-3 shrink-0 ${(a.balance ?? 0) < 0 ? "text-neg" : "text-fg"}`}>
                    {signed(a.balance ?? 0)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="transactions-heading" className="bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 id="transactions-heading" className="text-[15px] font-semibold text-fg">Recent activity</h2>
          <Link href="/months" className="text-sm font-medium text-accent hover:text-accent-hover">
            All →
          </Link>
        </div>
        {transactions.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted text-center">No transactions yet.</p>
        ) : (
          <TransactionList transactions={transactions} onSelect={(tx) => openQuickAdd(tx)} />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono text-xl ${tone}`}>{value}</p>
    </div>
  );
}

function CardHeader({ id, title, href, linkLabel = "View all" }: { id: string; title: string; href: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 id={id} className="text-[15px] font-semibold text-fg">{title}</h2>
      <Link href={href} className="font-mono text-xs text-faint hover:text-accent transition-colors" aria-label={`Open ${title}`}>
        {linkLabel} →
      </Link>
    </div>
  );
}
