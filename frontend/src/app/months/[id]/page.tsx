"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, FileText, Trash2 } from "lucide-react";
import {
  getMonth,
  getBudgets,
  getCategories,
  applyBudgetToMonth,
  deleteMonth,
  updateTransactionStatus,
} from "@/lib/api";
import { fmtWhole } from "@/lib/format";
import { localISO } from "@/lib/date";
import { MONTH_NAMES, STATUS_ORDER } from "@/lib/constants";
import type { Category, Transaction, Month as MonthData, BudgetTemplate } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { TransactionList } from "@/components/TransactionList";
import { TRANSACTIONS_CHANGED, openQuickAdd } from "@/components/QuickAddTransaction";

type Status = (typeof STATUS_ORDER)[number];
type Filter = "all" | "budget" | "other";

export default function MonthDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [month, setMonth] = useState<MonthData | null>(null);
  const [budgets, setBudgets] = useState<BudgetTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [showApply, setShowApply] = useState(false);
  const [applyBudgetId, setApplyBudgetId] = useState("");
  const [confirmDeleteMonth, setConfirmDeleteMonth] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, b, cats] = await Promise.all([getMonth(id), getBudgets(), getCategories()]);
      setMonth(m);
      setBudgets(b);
      setCategories(cats);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Reload after a transaction is added, edited or deleted in the transaction sheet.
    window.addEventListener(TRANSACTIONS_CHANGED, load);
    return () => window.removeEventListener(TRANSACTIONS_CHANGED, load);
  }, [load]);

  const handleApplyBudget = async () => {
    if (!applyBudgetId) return;
    try {
      await applyBudgetToMonth(id, applyBudgetId);
      setShowApply(false);
      setApplyBudgetId("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteMonth = async () => {
    try {
      await deleteMonth(id);
      router.push("/months");
    } catch (e: any) {
      setConfirmDeleteMonth(false);
      setError(e.message);
    }
  };

  const handleStatusCycle = async (tx: Transaction) => {
    const currentIdx = STATUS_ORDER.indexOf(tx.status as Status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    try {
      await updateTransactionStatus(tx.id, nextStatus);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading month..." />;
  }

  if (!month) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted">
          Month not found.{" "}
          <Link href="/months" className="text-accent font-medium">
            Back to transactions
          </Link>
        </p>
      </div>
    );
  }

  const transactions = month.transactions || [];
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const templateCount = sortedTx.filter((t) => t.fromTemplate).length;
  const shown = sortedTx.filter((t) => (filter === "all" ? true : filter === "budget" ? t.fromTemplate : !t.fromTemplate));

  const sum = (type: string, paidOnly: boolean) =>
    transactions
      .filter((t) => t.type === type && (paidOnly ? t.status === "PAID" : t.status !== "SKIPPED"))
      .reduce((s, t) => s + t.amount, 0);
  const paidIncome = sum("INCOME", true);
  const paidSpending = sum("SPENDING", true);
  const plannedIncome = sum("INCOME", false);
  const plannedSpending = sum("SPENDING", false);
  const net = paidIncome - paidSpending;
  const plannedNet = plannedIncome - plannedSpending;

  // New transactions default to today when it's in this month, else the month's first day.
  const prefix = `${month.year}-${String(month.month).padStart(2, "0")}`;
  const today = localISO();
  const newDate = today.startsWith(prefix) ? today : `${prefix}-01`;

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <Link href="/months" className="inline-flex items-center gap-1 -ml-1 mb-1 text-sm font-medium text-muted hover:text-fg">
        <ChevronLeft size={16} aria-hidden="true" />
        Transactions
      </Link>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-5">
        <h1 className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-fg mr-auto">
          {MONTH_NAMES[month.month - 1]} {month.year}
        </h1>
        <button
          onClick={() => openQuickAdd({ date: newDate, monthId: id })}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Plus size={16} aria-hidden="true" /> Add
        </button>
      </div>

      {/* Totals first: what came in, what went out, what's left. */}
      <section aria-label="Totals" className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
        <Stat label="In" value={paidIncome} planned={plannedIncome} tone="pos" />
        <Stat label="Out" value={paidSpending} planned={plannedSpending} tone="neg" />
        <Stat label="Net" value={net} planned={plannedNet} tone={net >= 0 ? "pos" : "neg"} signed />
      </section>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div role="tablist" aria-label="Show" className="flex p-1 rounded-xl bg-surface-2">
          {(
            [
              ["all", `All ${transactions.length}`],
              ["budget", `Budget ${templateCount}`],
              ["other", `Other ${transactions.length - templateCount}`],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-lg text-[13px] font-medium transition-colors ${
                filter === f ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {month.budgetTemplate && (
          <span className="hidden sm:inline text-xs text-muted">Budget: {month.budgetTemplate.name}</span>
        )}
      </div>

      <div className="bg-surface rounded-2xl border border-line overflow-hidden mb-6">
        {shown.length > 0 ? (
          <TransactionList
            transactions={shown}
            categories={categories}
            onSelect={(tx) => openQuickAdd(tx)}
            onStatusCycle={handleStatusCycle}
          />
        ) : (
          <div className="px-5 py-10 text-center text-sm text-muted">
            {filter === "budget"
              ? "No budget transactions. Apply a budget template below to plan this month."
              : "Nothing here yet. Tap Add to record a transaction."}
          </div>
        )}
      </div>

      {/* Rarely used: kept at the bottom, out of the way. */}
      <section aria-label="Month options" className="bg-surface rounded-2xl border border-line divide-y divide-line">
        <div className="px-4 py-3">
          {showApply ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[12rem]">
                <label htmlFor="apply-budget" className="block text-sm font-medium text-fg-2 mb-1">
                  Budget template
                </label>
                <select
                  id="apply-budget"
                  value={applyBudgetId}
                  onChange={(e) => setApplyBudgetId(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Choose...</option>
                  {budgets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleApplyBudget}
                disabled={!applyBudgetId}
                className="px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setShowApply(false)}
                className="px-4 py-2 text-sm font-medium text-muted bg-surface-2 rounded-xl hover:bg-line transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setShowApply(true)} className="w-full flex items-center gap-3 text-sm font-medium text-fg">
              <FileText size={16} className="text-muted" aria-hidden="true" />
              <span className="flex-1 text-left">
                Apply a budget template
                {month.budgetTemplate && <span className="block text-xs font-normal text-muted">Current: {month.budgetTemplate.name}</span>}
              </span>
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          {confirmDeleteMonth ? (
            <ConfirmDelete
              label="Delete the month and all its transactions?"
              onConfirm={handleDeleteMonth}
              onCancel={() => setConfirmDeleteMonth(false)}
            />
          ) : (
            <button onClick={() => setConfirmDeleteMonth(true)} className="w-full flex items-center gap-3 text-sm font-medium text-neg">
              <Trash2 size={16} aria-hidden="true" />
              Delete month
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  planned,
  tone,
  signed,
}: {
  label: string;
  value: number;
  planned: number;
  tone: "pos" | "neg";
  signed?: boolean;
}) {
  const progress = planned > 0 && !signed ? Math.min(value / planned, 1) : null;
  return (
    <div className="bg-surface border border-line rounded-2xl p-3 sm:p-4 min-w-0">
      <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`mt-1 text-base sm:text-xl font-semibold font-mono truncate ${tone === "pos" ? "text-pos" : "text-neg"}`}>
        {signed ? (value >= 0 ? "+" : "−") : ""}
        {fmtWhole(value)}
      </p>
      <p className="mt-0.5 text-[11px] sm:text-xs text-muted truncate">
        {signed ? "planned " : "of "}
        {signed && planned < 0 ? "−" : ""}
        {fmtWhole(planned)}
      </p>
      {progress !== null && (
        <span className="mt-2 block h-1 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
          <span className={`block h-full rounded-full ${tone === "pos" ? "bg-pos" : "bg-accent"}`} style={{ width: `${progress * 100}%` }} />
        </span>
      )}
    </div>
  );
}
