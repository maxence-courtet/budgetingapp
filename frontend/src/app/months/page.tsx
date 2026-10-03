"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMonths, createMonth, deleteMonth, getBudgets } from "@/lib/api";
import { fmt } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";

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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { month: formMonth, year: formYear };
      if (formBudgetId) payload.budgetTemplateId = formBudgetId;
      await createMonth(payload);
      setShowForm(false);
      setFormBudgetId("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMonth(id);
      setDeleteConfirm(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading months..." />;
  }

  return (
    <div>
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Months</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "Cancel" : "New Month"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label htmlFor="form-month" className="block text-sm font-medium text-slate-700 mb-1">
                Month
              </label>
              <select
                id="form-month"
                value={formMonth}
                onChange={(e) => setFormMonth(parseInt(e.target.value))}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="form-year" className="block text-sm font-medium text-slate-700 mb-1">
                Year
              </label>
              <input
                id="form-year"
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(parseInt(e.target.value))}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label htmlFor="form-budget" className="block text-sm font-medium text-slate-700 mb-1">
                Budget Template (optional)
              </label>
              <select
                id="form-budget"
                value={formBudgetId}
                onChange={(e) => setFormBudgetId(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create
            </button>
          </form>
        </div>
      )}

      {months.length === 0 ? (
        <EmptyState message="No months yet." />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Month / Year
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Budget Template
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Transactions
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Income
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Spending
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Net
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/months/${m.id}`}
                          className="font-medium text-slate-900 hover:text-slate-700 transition-colors"
                        >
                          {MONTH_NAMES[m.month - 1]} {m.year}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.budgetTemplate?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {m.transactionCount}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">
                        {fmt(m.income)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">
                        {fmt(m.spending)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          m.net >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {m.net >= 0 ? "+" : "-"}
                        {fmt(m.net)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deleteConfirm === m.id ? (
                          <ConfirmDelete
                            onConfirm={() => handleDelete(m.id)}
                            onCancel={() => setDeleteConfirm(null)}
                            label="Delete month and all its transactions?"
                          />
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(m.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
