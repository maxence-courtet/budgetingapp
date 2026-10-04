"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getBudget,
  updateBudget,
  addBudgetDefinition,
  updateBudgetDefinition,
  deleteBudgetDefinition,
  getCategories,
  getAccounts,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";

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
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingDefId, setEditingDefId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEditDef = (d: Definition) => {
    setEditingDefId(d.id);
    setEditForm({
      type: d.type,
      amount: String(d.amount),
      categoryId: d.categoryId,
      toCategoryId: d.toCategoryId ?? "",
      fromAccountId: d.fromAccountId ?? "",
      toAccountId: d.toAccountId ?? "",
      description: d.description ?? "",
    });
  };

  const handleUpdateDef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budget || !editingDefId || !editForm.categoryId || !editForm.amount) return;
    try {
      const payload: any = {
        type: editForm.type,
        amount: parseFloat(editForm.amount),
        categoryId: editForm.categoryId,
        description: editForm.description || undefined,
      };
      if (editForm.type === "TRANSFER" && editForm.toCategoryId) {
        payload.toCategoryId = editForm.toCategoryId;
      }
      if (
        (editForm.type === "SPENDING" || editForm.type === "TRANSFER") &&
        editForm.fromAccountId
      ) {
        payload.fromAccountId = editForm.fromAccountId;
      }
      if (
        (editForm.type === "INCOME" || editForm.type === "TRANSFER") &&
        editForm.toAccountId
      ) {
        payload.toAccountId = editForm.toAccountId;
      }
      await updateBudgetDefinition(budget.id, editingDefId, payload);
      setEditingDefId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteDef = async (defId: string) => {
    if (!budget) return;
    try {
      await deleteBudgetDefinition(budget.id, defId);
      setConfirmDeleteId(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading budget..." />;
  }

  if (!budget) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted">Budget template not found.</p>
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
          className="text-sm text-muted hover:text-fg-2 transition-colors"
        >
          &larr; Back to Budgets
        </Link>
      </div>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Name */}
      <div className="flex items-center gap-3 mb-6">
        {editingName ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-2xl font-bold text-fg border border-line-strong rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/40"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              className="px-3 py-1.5 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded-xl transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setName(budget.name);
              }}
              className="px-3 py-1.5 text-sm font-medium text-muted bg-surface-2 rounded-xl hover:bg-line transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h1 className="text-[28px] font-semibold tracking-tight text-fg">
              {budget.name}
            </h1>
            <button
              onClick={() => setEditingName(true)}
              className="px-3 py-1.5 text-sm font-medium text-muted bg-surface-2 rounded-xl hover:bg-line transition-colors"
            >
              Rename
            </button>
          </>
        )}
      </div>

      {/* Definitions Table */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">
            Definitions ({budget.definitions.length})
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-ink text-sm font-medium rounded-xl transition-colors"
          >
            {showForm ? "Cancel" : "Add Definition"}
          </button>
        </div>

        {budget.definitions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th
                    scope="col"
                    className="text-left px-4 py-3 font-medium text-muted"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 font-medium text-muted"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 font-medium text-muted"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 font-medium text-muted"
                  >
                    From Account
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 font-medium text-muted"
                  >
                    To Account
                  </th>
                  <th
                    scope="col"
                    className="text-left px-4 py-3 font-medium text-muted"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="text-right px-4 py-3 font-medium text-muted"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {budget.definitions.map((d) =>
                  editingDefId === d.id ? (
                    <tr key={d.id} className="border-b border-line bg-surface-2">
                      <td className="px-4 py-2">
                        <select
                          value={editForm.type}
                          onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
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
                          value={editForm.amount}
                          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          className="w-full px-2 py-1.5 border border-line-strong rounded text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-accent/40"
                          required
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editForm.categoryId}
                          onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                          className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                          required
                        >
                          <option value="">Select</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        {(editForm.type === "SPENDING" || editForm.type === "TRANSFER") ? (
                          <select
                            value={editForm.fromAccountId}
                            onChange={(e) => setEditForm({ ...editForm, fromAccountId: e.target.value })}
                            className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                          >
                            <option value="">None</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-faint">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {(editForm.type === "INCOME" || editForm.type === "TRANSFER") ? (
                          <select
                            value={editForm.toAccountId}
                            onChange={(e) => setEditForm({ ...editForm, toAccountId: e.target.value })}
                            className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                          >
                            <option value="">None</option>
                            {accounts.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-faint">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 border border-line-strong rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleUpdateDef}
                            className="text-pos hover:text-green-800 text-sm font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDefId(null)}
                            className="text-muted hover:text-fg-2 text-sm font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                  <tr
                    key={d.id}
                    className="border-b border-line hover:bg-surface-2"
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
                        <span className="text-faint">
                          {" "}
                          / {catName(d.toCategoryId)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {d.fromAccount?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {d.toAccount?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {d.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmDeleteId === d.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <ConfirmDelete
                            onConfirm={() => handleDeleteDef(d.id)}
                            onCancel={() => setConfirmDeleteId(null)}
                            label="Delete definition?"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEditDef(d)}
                            className="text-muted hover:text-fg text-sm font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(d.id)}
                            className="text-neg hover:text-red-800 text-sm font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {budget.definitions.length === 0 && !showForm && (
          <div className="px-5 py-8 text-center text-muted">
            No definitions yet. Add one to define your budget.
          </div>
        )}

        {/* Add Definition Form */}
        {showForm && (
          <form
            onSubmit={handleAddDefinition}
            className="p-5 border-t border-line bg-surface-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="def-type"
                  className="block text-sm font-medium text-fg-2 mb-1"
                >
                  Type
                </label>
                <select
                  id="def-type"
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="INCOME">INCOME</option>
                  <option value="SPENDING">SPENDING</option>
                  <option value="TRANSFER">TRANSFER</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="def-amount"
                  className="block text-sm font-medium text-fg-2 mb-1"
                >
                  Amount
                </label>
                <input
                  id="def-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="def-category"
                  className="block text-sm font-medium text-fg-2 mb-1"
                >
                  Category
                </label>
                <select
                  id="def-category"
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
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

              {form.type === "TRANSFER" && (
                <div>
                  <label
                    htmlFor="def-to-category"
                    className="block text-sm font-medium text-fg-2 mb-1"
                  >
                    To Category
                  </label>
                  <select
                    id="def-to-category"
                    value={form.toCategoryId}
                    onChange={(e) =>
                      setForm({ ...form, toCategoryId: e.target.value })
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

              {(form.type === "SPENDING" || form.type === "TRANSFER") && (
                <div>
                  <label
                    htmlFor="def-from-account"
                    className="block text-sm font-medium text-fg-2 mb-1"
                  >
                    From Account
                  </label>
                  <select
                    id="def-from-account"
                    value={form.fromAccountId}
                    onChange={(e) =>
                      setForm({ ...form, fromAccountId: e.target.value })
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

              {(form.type === "INCOME" || form.type === "TRANSFER") && (
                <div>
                  <label
                    htmlFor="def-to-account"
                    className="block text-sm font-medium text-fg-2 mb-1"
                  >
                    To Account
                  </label>
                  <select
                    id="def-to-account"
                    value={form.toAccountId}
                    onChange={(e) =>
                      setForm({ ...form, toAccountId: e.target.value })
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
                <label
                  htmlFor="def-description"
                  className="block text-sm font-medium text-fg-2 mb-1"
                >
                  Description
                </label>
                <input
                  id="def-description"
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-ink text-sm font-medium rounded-xl transition-colors"
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
          <div className="bg-surface rounded-2xl border border-line overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="text-lg font-semibold text-fg">Account Impact</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2">
                    <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Account</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Income</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Spending</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Transfers In</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Transfers Out</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {accountRows.map((a) => (
                    <tr key={a.id} className="border-b border-line hover:bg-surface-2">
                      <td className="px-4 py-3 font-medium text-fg">{a.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-pos">
                        {a.income > 0 ? fmt(a.income) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-neg">
                        {a.spending > 0 ? fmt(a.spending) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {a.transferIn > 0 ? fmt(a.transferIn) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {a.transferOut > 0 ? fmt(a.transferOut) : "-"}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-medium ${a.net >= 0 ? "text-pos" : "text-neg"}`}>
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
        <div className="bg-surface rounded-2xl border border-line p-5">
          <h2 className="text-lg font-semibold text-fg mb-3">
            Months Using This Template
          </h2>
          <div className="flex flex-wrap gap-2">
            {budget.months.map((m) => (
              <Link
                key={m.id}
                href={`/months/${m.id}`}
                className="px-3 py-1.5 text-sm font-medium text-fg-2 bg-surface-2 rounded-xl hover:bg-line transition-colors"
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
