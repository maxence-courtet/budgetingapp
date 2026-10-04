"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getMonth,
  getBudgets,
  getCategories,
  getAccounts,
  applyBudgetToMonth,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  updateTransactionStatus,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { MONTH_NAMES, STATUS_COLORS, STATUS_ORDER } from "@/lib/constants";
import type { Category, Account, Transaction, Month as MonthData, BudgetTemplate } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { TypeBadge } from "@/components/ui/TypeBadge";

type Status = (typeof STATUS_ORDER)[number];

const emptyTxForm = {
  type: "SPENDING",
  date: new Date().toISOString().slice(0, 10),
  amount: "",
  description: "",
  categoryId: "",
  toCategoryId: "",
  fromAccountId: "",
  toAccountId: "",
  status: "PLANNED",
};

function TransactionTable({
  txList,
  editingTxId,
  editTxForm,
  setEditTxForm,
  handleUpdateTx,
  setEditingTxId,
  handleStatusCycle,
  startEditTx,
  confirmDeleteTxId,
  handleDeleteTx,
  setConfirmDeleteTxId,
  categories,
  accounts,
}: {
  txList: Transaction[];
  editingTxId: string | null;
  editTxForm: typeof emptyTxForm;
  setEditTxForm: (f: typeof emptyTxForm) => void;
  handleUpdateTx: (e: React.FormEvent) => void;
  setEditingTxId: (id: string | null) => void;
  handleStatusCycle: (tx: Transaction) => void;
  startEditTx: (tx: Transaction) => void;
  confirmDeleteTxId: string | null;
  handleDeleteTx: (id: string) => void;
  setConfirmDeleteTxId: (id: string | null) => void;
  categories: Category[];
  accounts: Account[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2">
            <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Date</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Description</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Type</th>
            <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Amount</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Category</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Account(s)</th>
            <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Status</th>
            <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {txList.map((tx) => {
            if (editingTxId === tx.id) {
              return (
                <tr key={tx.id} className="border-b border-line bg-surface-2">
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={editTxForm.date}
                      onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                      className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editTxForm.description}
                      onChange={(e) => setEditTxForm({ ...editTxForm, description: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editTxForm.type}
                      onChange={(e) => setEditTxForm({ ...editTxForm, type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      <option value="INCOME">INCOME</option>
                      <option value="SPENDING">SPENDING</option>
                      <option value="TRANSFER">TRANSFER</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editTxForm.amount}
                      onChange={(e) => setEditTxForm({ ...editTxForm, amount: e.target.value })}
                      className="w-full px-2 py-1.5 border border-line-strong rounded text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-accent/40"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editTxForm.categoryId}
                      onChange={(e) => setEditTxForm({ ...editTxForm, categoryId: e.target.value })}
                      className={`w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40${editTxForm.type === "TRANSFER" ? " mb-1" : ""}`}
                      required
                    >
                      <option value="">From category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {editTxForm.type === "TRANSFER" && (
                      <select
                        value={editTxForm.toCategoryId}
                        onChange={(e) => setEditTxForm({ ...editTxForm, toCategoryId: e.target.value })}
                        className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        <option value="">To category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {(editTxForm.type === "SPENDING" || editTxForm.type === "TRANSFER") && (
                      <select
                        value={editTxForm.fromAccountId}
                        onChange={(e) => setEditTxForm({ ...editTxForm, fromAccountId: e.target.value })}
                        className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 mb-1"
                      >
                        <option value="">From...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}
                    {(editTxForm.type === "INCOME" || editTxForm.type === "TRANSFER") && (
                      <select
                        value={editTxForm.toAccountId}
                        onChange={(e) => setEditTxForm({ ...editTxForm, toAccountId: e.target.value })}
                        className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                      >
                        <option value="">To...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}
                    {editTxForm.type !== "SPENDING" && editTxForm.type !== "INCOME" && editTxForm.type !== "TRANSFER" && (
                      <span className="text-faint">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editTxForm.status}
                      onChange={(e) => setEditTxForm({ ...editTxForm, status: e.target.value })}
                      className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={handleUpdateTx}
                        className="text-pos hover:text-green-800 text-sm font-medium transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTxId(null)}
                        className="text-muted hover:text-fg-2 text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }

            const accountStr =
              tx.type === "TRANSFER"
                ? `${tx.fromAccount?.name ?? "-"} → ${tx.toAccount?.name ?? "-"}`
                : tx.type === "SPENDING"
                ? tx.fromAccount?.name ?? "-"
                : tx.toAccount?.name ?? "-";

            const amountPrefix =
              tx.type === "INCOME"
                ? "+"
                : tx.type === "SPENDING"
                ? "-"
                : "";

            const amountColor =
              tx.type === "INCOME"
                ? "text-pos"
                : tx.type === "SPENDING"
                ? "text-neg"
                : "text-muted";

            return (
              <tr
                key={tx.id}
                className={`border-b border-line hover:bg-surface-2 ${
                  tx.status === "SKIPPED" ? "opacity-50" : ""
                }`}
              >
                <td className="px-4 py-3 text-muted whitespace-nowrap">
                  {new Date(tx.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-fg">
                  {tx.description || "-"}
                </td>
                <td className="px-4 py-3">
                  <TypeBadge type={tx.type} />
                </td>
                <td
                  className={`px-4 py-3 text-right font-mono ${amountColor}`}
                >
                  {amountPrefix}
                  {fmt(tx.amount)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {tx.category?.name ?? "-"}
                  {tx.toCategoryId && (
                    <span className="text-faint">
                      {" "}
                      /{" "}
                      {categories.find((c) => c.id === tx.toCategoryId)
                        ?.name ?? ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted whitespace-nowrap">
                  {accountStr}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleStatusCycle(tx)}
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                      STATUS_COLORS[tx.status as Status] || ""
                    }`}
                    aria-label={`Status: ${tx.status}. Click to cycle`}
                  >
                    {tx.status}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmDeleteTxId === tx.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDeleteTx(tx.id)}
                      onCancel={() => setConfirmDeleteTxId(null)}
                    />
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEditTx(tx)}
                        className="text-muted hover:text-fg text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTxId(tx.id)}
                        className="text-neg hover:text-red-800 text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MonthDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [month, setMonth] = useState<MonthData | null>(null);
  const [budgets, setBudgets] = useState<BudgetTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showApply, setShowApply] = useState(false);
  const [applyBudgetId, setApplyBudgetId] = useState("");

  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState(emptyTxForm);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxForm, setEditTxForm] = useState(emptyTxForm);
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, b, cats, accs] = await Promise.all([
        getMonth(id),
        getBudgets(),
        getCategories(),
        getAccounts(),
      ]);
      setMonth(m);
      setBudgets(b);
      setCategories(cats);
      setAccounts(accs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Set default date to first day of month when month loads
  useEffect(() => {
    if (month) {
      const d = `${month.year}-${String(month.month).padStart(2, "0")}-01`;
      setTxForm((prev) => ({ ...prev, date: d }));
    }
  }, [month]);

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

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.categoryId || !txForm.amount) return;
    try {
      const payload: any = {
        type: txForm.type,
        date: txForm.date,
        amount: parseFloat(txForm.amount),
        description: txForm.description || undefined,
        categoryId: txForm.categoryId,
        status: txForm.status,
        monthId: id,
      };
      if (txForm.type === "TRANSFER" && txForm.toCategoryId) {
        payload.toCategoryId = txForm.toCategoryId;
      }
      if (
        (txForm.type === "SPENDING" || txForm.type === "TRANSFER") &&
        txForm.fromAccountId
      ) {
        payload.fromAccountId = txForm.fromAccountId;
      }
      if (
        (txForm.type === "INCOME" || txForm.type === "TRANSFER") &&
        txForm.toAccountId
      ) {
        payload.toAccountId = txForm.toAccountId;
      }
      await createTransaction(payload);
      setTxForm({
        ...emptyTxForm,
        date: `${month!.year}-${String(month!.month).padStart(2, "0")}-01`,
      });
      setShowTxForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditTxForm({
      type: tx.type,
      date: tx.date.slice(0, 10),
      amount: String(tx.amount),
      description: tx.description ?? "",
      categoryId: tx.categoryId,
      toCategoryId: tx.toCategoryId ?? "",
      fromAccountId: tx.fromAccountId ?? "",
      toAccountId: tx.toAccountId ?? "",
      status: tx.status,
    });
  };

  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxId || !editTxForm.categoryId || !editTxForm.amount) return;
    try {
      const payload: any = {
        type: editTxForm.type,
        date: editTxForm.date,
        amount: parseFloat(editTxForm.amount),
        description: editTxForm.description || undefined,
        categoryId: editTxForm.categoryId,
        status: editTxForm.status,
      };
      if (editTxForm.type === "TRANSFER" && editTxForm.toCategoryId) {
        payload.toCategoryId = editTxForm.toCategoryId;
      }
      if (
        (editTxForm.type === "SPENDING" || editTxForm.type === "TRANSFER") &&
        editTxForm.fromAccountId
      ) {
        payload.fromAccountId = editTxForm.fromAccountId;
      }
      if (
        (editTxForm.type === "INCOME" || editTxForm.type === "TRANSFER") &&
        editTxForm.toAccountId
      ) {
        payload.toAccountId = editTxForm.toAccountId;
      }
      await updateTransaction(editingTxId, payload);
      setEditingTxId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    try {
      await deleteTransaction(txId);
      setConfirmDeleteTxId(null);
      load();
    } catch (e: any) {
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
        <p className="text-muted">Month not found.</p>
      </div>
    );
  }

  const transactions = month.transactions || [];
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const templateTx = sortedTx.filter((t) => t.fromTemplate);
  const manualTx = sortedTx.filter((t) => !t.fromTemplate);

  // Summaries
  const paidIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status === "PAID")
    .reduce((s, t) => s + t.amount, 0);
  const paidSpending = transactions
    .filter((t) => t.type === "SPENDING" && t.status === "PAID")
    .reduce((s, t) => s + t.amount, 0);
  const plannedIncome = transactions
    .filter((t) => t.type === "INCOME" && t.status !== "SKIPPED")
    .reduce((s, t) => s + t.amount, 0);
  const plannedSpending = transactions
    .filter((t) => t.type === "SPENDING" && t.status !== "SKIPPED")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className="mb-1">
        <Link
          href="/months"
          className="text-sm text-muted hover:text-fg-2 transition-colors"
        >
          &larr; Back to Months
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">
          {MONTH_NAMES[month.month - 1]} {month.year}
        </h1>
        {month.budgetTemplate && (
          <span className="px-3 py-1 text-sm bg-surface-2 text-muted rounded-xl">
            Template: {month.budgetTemplate.name}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowApply(!showApply)}
            className="px-4 py-2 text-sm font-medium text-fg-2 bg-surface-2 rounded-xl hover:bg-line transition-colors"
          >
            Apply Budget
          </button>
          <button
            onClick={() => setShowTxForm(!showTxForm)}
            className="px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
          >
            {showTxForm ? "Cancel" : "Add Transaction"}
          </button>
        </div>
      </div>

      {/* Apply Budget */}
      {showApply && (
        <div className="bg-surface rounded-2xl border border-line p-4 mb-6">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-fg-2 mb-1">
                Select Budget Template
              </label>
              <select
                value={applyBudgetId}
                onChange={(e) => setApplyBudgetId(e.target.value)}
                className="px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
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
              className="px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        </div>
      )}

      {/* Add Transaction Form */}
      {showTxForm && (
        <div className="bg-surface rounded-2xl border border-line p-5 mb-6">
          <h2 className="text-lg font-semibold text-fg mb-4">
            New Transaction
          </h2>
          <form onSubmit={handleCreateTx}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  Type
                </label>
                <select
                  value={txForm.type}
                  onChange={(e) =>
                    setTxForm({ ...txForm, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="INCOME">INCOME</option>
                  <option value="SPENDING">SPENDING</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) =>
                    setTxForm({ ...txForm, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={txForm.amount}
                  onChange={(e) =>
                    setTxForm({ ...txForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) =>
                    setTxForm({ ...txForm, description: e.target.value })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  Category
                </label>
                <select
                  value={txForm.categoryId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {txForm.type === "TRANSFER" && (
                <div>
                  <label className="block text-sm font-medium text-fg-2 mb-1">
                    To Category
                  </label>
                  <select
                    value={txForm.toCategoryId}
                    onChange={(e) =>
                      setTxForm({ ...txForm, toCategoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(txForm.type === "SPENDING" || txForm.type === "TRANSFER") && (
                <div>
                  <label className="block text-sm font-medium text-fg-2 mb-1">
                    From Account
                  </label>
                  <select
                    value={txForm.fromAccountId}
                    onChange={(e) =>
                      setTxForm({ ...txForm, fromAccountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(txForm.type === "INCOME" || txForm.type === "TRANSFER") && (
                <div>
                  <label className="block text-sm font-medium text-fg-2 mb-1">
                    To Account
                  </label>
                  <select
                    value={txForm.toAccountId}
                    onChange={(e) =>
                      setTxForm({ ...txForm, toAccountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <option value="">Select account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-fg-2 mb-1">
                  Status
                </label>
                <select
                  value={txForm.status}
                  onChange={(e) =>
                    setTxForm({ ...txForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
              >
                Save Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budget Transactions Table */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-fg">
            Budget Transactions ({templateTx.length})
          </h2>
        </div>

        {templateTx.length > 0 ? (
          <TransactionTable
            txList={templateTx}
            editingTxId={editingTxId}
            editTxForm={editTxForm}
            setEditTxForm={setEditTxForm}
            handleUpdateTx={handleUpdateTx}
            setEditingTxId={setEditingTxId}
            handleStatusCycle={handleStatusCycle}
            startEditTx={startEditTx}
            confirmDeleteTxId={confirmDeleteTxId}
            handleDeleteTx={handleDeleteTx}
            setConfirmDeleteTxId={setConfirmDeleteTxId}
            categories={categories}
            accounts={accounts}
          />
        ) : (
          <div className="px-5 py-8 text-center text-muted">
            No budget transactions. Apply a budget template to generate them.
          </div>
        )}
      </div>

      {/* Additional Transactions Table */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-fg">
            Additional Transactions ({manualTx.length})
          </h2>
        </div>

        {manualTx.length > 0 ? (
          <TransactionTable
            txList={manualTx}
            editingTxId={editingTxId}
            editTxForm={editTxForm}
            setEditTxForm={setEditTxForm}
            handleUpdateTx={handleUpdateTx}
            setEditingTxId={setEditingTxId}
            handleStatusCycle={handleStatusCycle}
            startEditTx={startEditTx}
            confirmDeleteTxId={confirmDeleteTxId}
            handleDeleteTx={handleDeleteTx}
            setConfirmDeleteTxId={setConfirmDeleteTxId}
            categories={categories}
            accounts={accounts}
          />
        ) : (
          <div className="px-5 py-8 text-center text-muted">
            No additional transactions. Add one manually above.
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl border border-line p-5">
          <h3 className="text-lg font-semibold text-fg mb-4">
            Paid Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">Total Paid Income</span>
              <span className="font-mono text-pos">
                +{fmt(paidIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Paid Spending</span>
              <span className="font-mono text-neg">
                -{fmt(paidSpending)}
              </span>
            </div>
            <div className="border-t border-line pt-3 flex justify-between font-semibold">
              <span className="text-fg">Net</span>
              <span
                className={`font-mono ${
                  paidIncome - paidSpending >= 0
                    ? "text-pos"
                    : "text-neg"
                }`}
              >
                {paidIncome - paidSpending >= 0 ? "+" : "-"}
                {fmt(paidIncome - paidSpending)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-line p-5">
          <h3 className="text-lg font-semibold text-fg mb-4">
            Planned vs Paid
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">Planned Income</span>
              <span className="font-mono text-fg-2">
                {fmt(plannedIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Paid Income</span>
              <span className="font-mono text-pos">
                {fmt(paidIncome)}
              </span>
            </div>
            <div className="border-t border-line pt-2" />
            <div className="flex justify-between">
              <span className="text-muted">Planned Spending</span>
              <span className="font-mono text-fg-2">
                {fmt(plannedSpending)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Paid Spending</span>
              <span className="font-mono text-neg">
                {fmt(paidSpending)}
              </span>
            </div>
            <div className="border-t border-line pt-3 flex justify-between font-semibold">
              <span className="text-fg">Planned Net</span>
              <span
                className={`font-mono ${
                  plannedIncome - plannedSpending >= 0
                    ? "text-pos"
                    : "text-neg"
                }`}
              >
                {plannedIncome - plannedSpending >= 0 ? "+" : "-"}
                {fmt(plannedIncome - plannedSpending)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
