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
  deleteTransaction,
  updateTransactionStatus,
} from "@/lib/api";

const fmt = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_ORDER = ["PLANNED", "PAID", "PENDING", "SKIPPED"] as const;
type Status = (typeof STATUS_ORDER)[number];

const STATUS_COLORS: Record<Status, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SKIPPED: "bg-slate-200 text-slate-400",
};

const TYPE_COLORS: Record<string, string> = {
  INCOME: "bg-green-100 text-green-700",
  SPENDING: "bg-red-100 text-red-700",
  TRANSFER: "bg-blue-100 text-blue-700",
};

interface Category {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Transaction {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string | null;
  status: string;
  categoryId: string;
  category: Category;
  toCategoryId: string | null;
  fromAccountId: string | null;
  fromAccount: Account | null;
  toAccountId: string | null;
  toAccount: Account | null;
}

interface MonthData {
  id: string;
  month: number;
  year: number;
  budgetTemplateId: string | null;
  budgetTemplate: { id: string; name: string } | null;
  transactions: Transaction[];
}

interface BudgetTemplate {
  id: string;
  name: string;
}

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

  const [showApply, setShowApply] = useState(false);
  const [applyBudgetId, setApplyBudgetId] = useState("");

  const [showTxForm, setShowTxForm] = useState(false);
  const [txForm, setTxForm] = useState(emptyTxForm);

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
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTx = async (txId: string) => {
    try {
      await deleteTransaction(txId);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusCycle = async (tx: Transaction) => {
    const currentIdx = STATUS_ORDER.indexOf(tx.status as Status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    try {
      await updateTransactionStatus(tx.id, nextStatus);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading month...</p>
      </div>
    );
  }

  if (!month) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Month not found.</p>
      </div>
    );
  }

  const transactions = month.transactions || [];
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

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
      <div className="mb-1">
        <Link
          href="/months"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          &larr; Back to Months
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {MONTH_NAMES[month.month - 1]} {month.year}
        </h1>
        {month.budgetTemplate && (
          <span className="px-3 py-1 text-sm bg-slate-100 text-slate-600 rounded-lg">
            Template: {month.budgetTemplate.name}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowApply(!showApply)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Apply Budget
          </button>
          <button
            onClick={() => setShowTxForm(!showTxForm)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {showTxForm ? "Cancel" : "Add Transaction"}
          </button>
        </div>
      </div>

      {/* Apply Budget */}
      {showApply && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select Budget Template
              </label>
              <select
                value={applyBudgetId}
                onChange={(e) => setApplyBudgetId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => setShowApply(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Transaction Form */}
      {showTxForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            New Transaction
          </h2>
          <form onSubmit={handleCreateTx}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={txForm.type}
                  onChange={(e) =>
                    setTxForm({ ...txForm, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="INCOME">INCOME</option>
                  <option value="SPENDING">SPENDING</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) =>
                    setTxForm({ ...txForm, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) =>
                    setTxForm({ ...txForm, description: e.target.value })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={txForm.categoryId}
                  onChange={(e) =>
                    setTxForm({ ...txForm, categoryId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Category
                  </label>
                  <select
                    value={txForm.toCategoryId}
                    onChange={(e) =>
                      setTxForm({ ...txForm, toCategoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    From Account
                  </label>
                  <select
                    value={txForm.fromAccountId}
                    onChange={(e) =>
                      setTxForm({ ...txForm, fromAccountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Account
                  </label>
                  <select
                    value={txForm.toAccountId}
                    onChange={(e) =>
                      setTxForm({ ...txForm, toAccountId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={txForm.status}
                  onChange={(e) =>
                    setTxForm({ ...txForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Save Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Transactions ({transactions.length})
          </h2>
        </div>

        {sortedTx.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Account(s)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTx.map((tx) => {
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
                      ? "text-green-600"
                      : tx.type === "SPENDING"
                      ? "text-red-600"
                      : "text-blue-600";

                  return (
                    <tr
                      key={tx.id}
                      className={`border-b border-slate-100 hover:bg-slate-50 ${
                        tx.status === "SKIPPED" ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {tx.description || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            TYPE_COLORS[tx.type] || ""
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${amountColor}`}
                      >
                        {amountPrefix}
                        {fmt(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {tx.category?.name ?? "-"}
                        {tx.toCategoryId && (
                          <span className="text-slate-400">
                            {" "}
                            /{" "}
                            {categories.find((c) => c.id === tx.toCategoryId)
                              ?.name ?? ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {accountStr}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleStatusCycle(tx)}
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                            STATUS_COLORS[tx.status as Status] || ""
                          }`}
                          title="Click to cycle status"
                        >
                          {tx.status}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center text-slate-500">
            No transactions yet. Add one or apply a budget template.
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Paid Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Paid Income</span>
              <span className="font-mono text-green-600">
                +{fmt(paidIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Paid Spending</span>
              <span className="font-mono text-red-600">
                -{fmt(paidSpending)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold">
              <span className="text-slate-900">Net</span>
              <span
                className={`font-mono ${
                  paidIncome - paidSpending >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {paidIncome - paidSpending >= 0 ? "+" : "-"}
                {fmt(paidIncome - paidSpending)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Planned vs Paid
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Planned Income</span>
              <span className="font-mono text-slate-700">
                {fmt(plannedIncome)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Paid Income</span>
              <span className="font-mono text-green-600">
                {fmt(paidIncome)}
              </span>
            </div>
            <div className="border-t border-slate-100 pt-2" />
            <div className="flex justify-between">
              <span className="text-slate-600">Planned Spending</span>
              <span className="font-mono text-slate-700">
                {fmt(plannedSpending)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Paid Spending</span>
              <span className="font-mono text-red-600">
                {fmt(paidSpending)}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between font-semibold">
              <span className="text-slate-900">Planned Net</span>
              <span
                className={`font-mono ${
                  plannedIncome - plannedSpending >= 0
                    ? "text-green-600"
                    : "text-red-600"
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
