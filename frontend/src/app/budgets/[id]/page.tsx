"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getBudget,
  updateBudget,
  addBudgetDefinition,
  deleteBudgetDefinition,
  getCategories,
  getAccounts,
} from "@/lib/api";

const fmt = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

interface Category {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Definition {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  categoryId: string;
  category: Category;
  toCategoryId: string | null;
  fromAccountId: string | null;
  fromAccount: Account | null;
  toAccountId: string | null;
  toAccount: Account | null;
}

interface BudgetTemplate {
  id: string;
  name: string;
  definitions: Definition[];
  months: { id: string; month: number; year: number }[];
}

const emptyForm = {
  type: "SPENDING",
  amount: "",
  categoryId: "",
  toCategoryId: "",
  fromAccountId: "",
  toAccountId: "",
  description: "",
};

export default function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [budget, setBudget] = useState<BudgetTemplate | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, cats, accs] = await Promise.all([
        getBudget(id),
        getCategories(),
        getAccounts(),
      ]);
      setBudget(b);
      setName(b.name);
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

  const handleSaveName = async () => {
    if (!name.trim() || !budget) return;
    try {
      await updateBudget(budget.id, { name: name.trim() });
      setEditingName(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget || !form.categoryId || !form.amount) return;
    try {
      const payload: any = {
        type: form.type,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        description: form.description || undefined,
      };
      if (form.type === "TRANSFER" && form.toCategoryId) {
        payload.toCategoryId = form.toCategoryId;
      }
      if (
        (form.type === "SPENDING" || form.type === "TRANSFER") &&
        form.fromAccountId
      ) {
        payload.fromAccountId = form.fromAccountId;
      }
      if (
        (form.type === "INCOME" || form.type === "TRANSFER") &&
        form.toAccountId
      ) {
        payload.toAccountId = form.toAccountId;
      }
      await addBudgetDefinition(budget.id, payload);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDef = async (defId: string) => {
    if (!budget) return;
    try {
      await deleteBudgetDefinition(budget.id, defId);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading budget template...</p>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Budget template not found.</p>
      </div>
    );
  }

  const catName = (cid: string) =>
    categories.find((c) => c.id === cid)?.name ?? "Unknown";

  return (
    <div>
      <div className="mb-1">
        <Link
          href="/budgets"
          className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          &larr; Back to Budgets
        </Link>
      </div>

      {/* Name */}
      <div className="flex items-center gap-3 mb-6">
        {editingName ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold text-slate-900 border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-slate-400"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setName(budget.name);
              }}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">
              {budget.name}
            </h1>
            <button
              onClick={() => setEditingName(true)}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Rename
            </button>
          </>
        )}
      </div>

      {/* Definitions Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Definitions ({budget.definitions.length})
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            {showForm ? "Cancel" : "Add Definition"}
          </button>
        </div>

        {budget.definitions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
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
                    From Account
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    To Account
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Description
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {budget.definitions.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          d.type === "INCOME"
                            ? "bg-green-100 text-green-700"
                            : d.type === "SPENDING"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {d.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {fmt(d.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {d.category?.name ?? catName(d.categoryId)}
                      {d.toCategoryId && (
                        <span className="text-slate-400">
                          {" "}
                          / {catName(d.toCategoryId)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {d.fromAccount?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {d.toAccount?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {d.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteDef(d.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {budget.definitions.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-slate-500">
            No definitions yet. Add one to define your budget.
          </div>
        )}

        {/* Add Definition Form */}
        {showForm && (
          <form
            onSubmit={handleAddDefinition}
            className="p-5 border-t border-slate-200 bg-slate-50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
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
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
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

              {form.type === "TRANSFER" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Category
                  </label>
                  <select
                    value={form.toCategoryId}
                    onChange={(e) =>
                      setForm({ ...form, toCategoryId: e.target.value })
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

              {(form.type === "SPENDING" || form.type === "TRANSFER") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    From Account
                  </label>
                  <select
                    value={form.fromAccountId}
                    onChange={(e) =>
                      setForm({ ...form, fromAccountId: e.target.value })
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

              {(form.type === "INCOME" || form.type === "TRANSFER") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    To Account
                  </label>
                  <select
                    value={form.toAccountId}
                    onChange={(e) =>
                      setForm({ ...form, toAccountId: e.target.value })
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
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
              >
                Save Definition
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Impact */}
      {(() => {
        const accountMap = new Map<
          string,
          { name: string; income: number; spending: number; transferIn: number; transferOut: number }
        >();

        for (const d of budget.definitions) {
          if (d.type === "INCOME" && d.toAccountId && d.toAccount) {
            const acc = accountMap.get(d.toAccountId) ?? { name: d.toAccount.name, income: 0, spending: 0, transferIn: 0, transferOut: 0 };
            acc.income += d.amount;
            accountMap.set(d.toAccountId, acc);
          }
          if (d.type === "SPENDING" && d.fromAccountId && d.fromAccount) {
            const acc = accountMap.get(d.fromAccountId) ?? { name: d.fromAccount.name, income: 0, spending: 0, transferIn: 0, transferOut: 0 };
            acc.spending += d.amount;
            accountMap.set(d.fromAccountId, acc);
          }
          if (d.type === "TRANSFER") {
            if (d.fromAccountId && d.fromAccount) {
              const acc = accountMap.get(d.fromAccountId) ?? { name: d.fromAccount.name, income: 0, spending: 0, transferIn: 0, transferOut: 0 };
              acc.transferOut += d.amount;
              accountMap.set(d.fromAccountId, acc);
            }
            if (d.toAccountId && d.toAccount) {
              const acc = accountMap.get(d.toAccountId) ?? { name: d.toAccount.name, income: 0, spending: 0, transferIn: 0, transferOut: 0 };
              acc.transferIn += d.amount;
              accountMap.set(d.toAccountId, acc);
            }
          }
        }

        const accountRows = Array.from(accountMap.entries()).map(([id, a]) => ({
          id,
          ...a,
          net: a.income + a.transferIn - a.spending - a.transferOut,
        }));

        if (accountRows.length === 0) return null;

        return (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Account Impact</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Account</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Income</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Spending</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Transfers In</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Transfers Out</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {accountRows.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-green-600">
                        {a.income > 0 ? fmt(a.income) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">
                        {a.spending > 0 ? fmt(a.spending) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">
                        {a.transferIn > 0 ? fmt(a.transferIn) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">
                        {a.transferOut > 0 ? fmt(a.transferOut) : "-"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${a.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {a.net >= 0 ? "+" : "-"}{fmt(a.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Months using this template */}
      {budget.months.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Months Using This Template
          </h2>
          <div className="flex flex-wrap gap-2">
            {budget.months.map((m) => (
              <Link
                key={m.id}
                href={`/months/${m.id}`}
                className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {MONTHS[m.month - 1]} {m.year}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
