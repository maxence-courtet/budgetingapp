"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMonths, createMonth, getBudgets } from "@/lib/api";
import { fmt } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronRight, Search } from "lucide-react";

interface MonthData {
  id: string;
  month: number;
  year: number;
  budgetTemplateId: string | null;
  budgetTemplate: { id: string; name: string } | null;
  transactionCount: number;
  income: number;
  spending: number;
  net: number;
  plannedIncome: number;
  plannedSpending: number;
}

interface BudgetTemplate {
  id: string;
  name: string;
}

export default function MonthsPage() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [budgets, setBudgets] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formBudgetId, setFormBudgetId] = useState("");
  const [query, setQuery] = useState("");
  const router = useRouter();

  const load = async () => {
    try {
      const [m, b] = await Promise.all([getMonths(), getBudgets()]);
      // Sort newest first
      m.sort((a: MonthData, b: MonthData) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      setMonths(m);
      setBudgets(b);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isInteger(formYear) || formYear < 1900 || formYear > 2200) {
      setError("Enter a 4-digit year.");
      return;
    }
    try {
      const payload: any = { month: formMonth, year: formYear };
      if (formBudgetId) payload.budgetTemplateId = formBudgetId;
      await createMonth(payload);
      setError("");
      setShowForm(false);
      setFormBudgetId("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading months..." />;
  }

  const byYear = months.reduce<Record<number, MonthData[]>>((acc, m) => {
    (acc[m.year] ??= []).push(m);
    return acc;
  }, {});
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <PageHeader
        title="Transactions"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-line-strong text-fg text-sm font-medium rounded-xl hover:border-accent transition-colors"
          >
            {showForm ? "Cancel" : <><CalendarPlus size={16} aria-hidden="true" /> New month</>}
          </button>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(query.trim() ? `/search?query=${encodeURIComponent(query.trim())}` : "/search");
        }}
        role="search"
        className="mb-5"
      >
        <label className="flex items-center gap-3 h-11 px-4 rounded-xl border border-line-strong bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <Search size={17} className="text-muted shrink-0" aria-hidden="true" />
          <span className="sr-only">Search transactions</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all transactions"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          />
          <Link href="/search" className="text-xs font-medium text-muted hover:text-fg whitespace-nowrap">
            Filters
          </Link>
        </label>
      </form>
      {showForm && (
        <div className="bg-surface rounded-2xl border border-line p-4 mb-6">
          <form
            onSubmit={handleCreate}
            className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3"
          >
            <div>
              <label htmlFor="form-month" className="block text-sm font-medium text-fg-2 mb-1">
                Month
              </label>
              <select
                id="form-month"
                value={formMonth}
                onChange={(e) => setFormMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-year" className="block text-sm font-medium text-fg-2 mb-1">
                Year
              </label>
              <input
                id="form-year"
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(parseInt(e.target.value))}
                className="w-full sm:w-24 px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label htmlFor="form-budget" className="block text-sm font-medium text-fg-2 mb-1">
                Budget template (optional)
              </label>
              <select
                id="form-budget"
                value={formBudgetId}
                onChange={(e) => setFormBudgetId(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">None</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="col-span-2 sm:col-span-1 px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
            >
              Create
            </button>
          </form>
        </div>
      )}

      {months.length === 0 ? (
        <EmptyState message="No months yet. Add a transaction with + and its month is created for you." />
      ) : (
        <div className="space-y-6">
          {years.map((year) => (
            <section key={year} aria-labelledby={`year-${year}`}>
              <h2 id={`year-${year}`} className="px-1 mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {year}
              </h2>
              <ul role="list" className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden">
                {byYear[year].map((m) => {
                  const planned = m.plannedSpending > 0 ? Math.min(m.spending / m.plannedSpending, 1.5) : null;
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/months/${m.id}`}
                        className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2 transition-colors"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-medium text-fg">{MONTH_NAMES[m.month - 1]}</span>
                          <span className="block text-xs text-muted truncate">
                            {m.transactionCount} transaction{m.transactionCount === 1 ? "" : "s"}
                            {m.budgetTemplate ? ` · ${m.budgetTemplate.name}` : ""}
                          </span>
                          {planned !== null && (
                            <span
                              className="mt-2 block h-1 w-full max-w-[12rem] rounded-full bg-surface-2 overflow-hidden"
                              title={`${fmt(m.spending)} of ${fmt(m.plannedSpending)} planned spending`}
                            >
                              <span
                                className={`block h-full rounded-full ${planned > 1 ? "bg-neg" : "bg-accent"}`}
                                style={{ width: `${Math.min(planned, 1) * 100}%` }}
                              />
                            </span>
                          )}
                        </span>
                        <span className="hidden sm:flex flex-col items-end text-xs font-mono">
                          <span className="text-pos">+{fmt(m.income)}</span>
                          <span className="text-neg">-{fmt(m.spending)}</span>
                        </span>
                        <span className="text-right">
                          <span className={`block text-[15px] font-semibold font-mono ${m.net >= 0 ? "text-pos" : "text-neg"}`}>
                            {m.net >= 0 ? "+" : "-"}
                            {fmt(m.net)}
                          </span>
                          <span className="block sm:hidden text-[11px] text-muted font-mono">
                            out {fmt(m.spending)}
                          </span>
                        </span>
                        <ChevronRight size={16} className="text-faint shrink-0" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
