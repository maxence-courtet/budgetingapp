"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  getBudget,
  updateBudget,
  addBudgetDefinition,
  updateBudgetDefinition,
  deleteBudgetDefinition,
  getCategories,
  getAccounts,
} from "@/lib/api";
import { fmt, fmtWhole } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { SpendingRing } from "@/components/SpendingRing";

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

type DefForm = typeof emptyForm;

const emptyForm = {
  type: "SPENDING",
  amount: "",
  categoryId: "",
  toCategoryId: "",
  fromAccountId: "",
  toAccountId: "",
  description: "",
};

const TYPES = [
  { value: "INCOME", label: "Income" },
  { value: "SPENDING", label: "Spending" },
  { value: "TRANSFER", label: "Transfer" },
];

const SECTIONS = [
  { type: "INCOME", title: "Income" },
  { type: "SPENDING", title: "Spending" },
  { type: "TRANSFER", title: "Transfers" },
];

function toPayload(f: DefForm) {
  const payload: any = {
    type: f.type,
    amount: parseFloat(f.amount),
    categoryId: f.categoryId,
    description: f.description || undefined,
  };
  if (f.type === "TRANSFER" && f.toCategoryId) payload.toCategoryId = f.toCategoryId;
  if ((f.type === "SPENDING" || f.type === "TRANSFER") && f.fromAccountId) payload.fromAccountId = f.fromAccountId;
  if ((f.type === "INCOME" || f.type === "TRANSFER") && f.toAccountId) payload.toAccountId = f.toAccountId;
  return payload;
}

const inputCls =
  "w-full px-3 py-2 border border-line-strong rounded-xl text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent";
const labelCls = "block text-sm font-medium text-fg-2 mb-1";

/** Add/edit form for one template line: one column on phones, two from sm up. */
function DefinitionForm({
  idPrefix,
  form,
  setForm,
  categories,
  accounts,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  form: DefForm;
  setForm: (f: DefForm) => void;
  categories: Category[];
  accounts: Account[];
  submitLabel: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  const id = (k: string) => `${idPrefix}-${k}`;
  const showFrom = form.type === "SPENDING" || form.type === "TRANSFER";
  const showTo = form.type === "INCOME" || form.type === "TRANSFER";
  return (
    <form onSubmit={onSubmit} className="p-4 sm:p-5 bg-surface-2">
      <fieldset className="mb-4">
        <legend className="sr-only">Type</legend>
        <div className="flex p-1 rounded-xl bg-canvas border border-line w-full sm:w-auto sm:inline-flex">
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex-1 sm:flex-none text-center px-4 py-1.5 text-sm font-medium rounded-lg cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                form.type === t.value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              <input
                type="radio"
                name={id("type")}
                value={t.value}
                checked={form.type === t.value}
                onChange={() => setForm({ ...form, type: t.value })}
                className="sr-only"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={id("amount")} className={labelCls}>Amount</label>
          <input
            id={id("amount")}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
            className={`${inputCls} font-mono`}
            required
          />
        </div>
        <div>
          <label htmlFor={id("category")} className={labelCls}>
            {form.type === "TRANSFER" ? "From category" : "Category"}
          </label>
          <select
            id={id("category")}
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className={inputCls}
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {form.type === "TRANSFER" && (
          <div>
            <label htmlFor={id("to-category")} className={labelCls}>To category</label>
            <select
              id={id("to-category")}
              value={form.toCategoryId}
              onChange={(e) => setForm({ ...form, toCategoryId: e.target.value })}
              className={inputCls}
            >
              <option value="">Same category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {showFrom && (
          <div>
            <label htmlFor={id("from-account")} className={labelCls}>
              {form.type === "TRANSFER" ? "From account" : "Paid from"}
            </label>
            <select
              id={id("from-account")}
              value={form.fromAccountId}
              onChange={(e) => setForm({ ...form, fromAccountId: e.target.value })}
              className={inputCls}
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        {showTo && (
          <div>
            <label htmlFor={id("to-account")} className={labelCls}>
              {form.type === "TRANSFER" ? "To account" : "Paid into"}
            </label>
            <select
              id={id("to-account")}
              value={form.toAccountId}
              onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
              className={inputCls}
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className={form.type === "TRANSFER" ? "" : "sm:col-span-2"}>
          <label htmlFor={id("description")} className={labelCls}>Description</label>
          <input
            id={id("description")}
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional, e.g. Rent"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={!form.amount || !form.categoryId}
          className="flex-1 sm:flex-none px-4 py-2 bg-accent hover:bg-accent-hover text-accent-ink text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

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

  const handleSaveName = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      await addBudgetDefinition(budget.id, toPayload(form));
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const startEditDef = (d: Definition) => {
    setShowForm(false);
    setConfirmDeleteId(null);
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
      await updateBudgetDefinition(budget.id, editingDefId, toPayload(editForm));
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
    return <LoadingState message="Loading budget template..." />;
  }

  if (!budget) {
    return (
      <div>
        <PageHeader title="Budget template" back={{ href: "/budgets", label: "Budget templates" }} />
        {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}
        <p className="text-muted">This budget template could not be found.</p>
      </div>
    );
  }

  const catName = (cid: string) =>
    categories.find((c) => c.id === cid)?.name ?? "Unknown";

  const sum = (type: string) =>
    budget.definitions.filter((d) => d.type === type).reduce((s, d) => s + d.amount, 0);
  const income = sum("INCOME");
  const spending = sum("SPENDING");
  const transfers = sum("TRANSFER");
  const net = income - spending;

  const plannedByCategory = Array.from(
    budget.definitions
      .filter((d) => d.type === "SPENDING")
      .reduce((m, d) => {
        const entry = m.get(d.categoryId) ?? { id: d.categoryId, name: d.category?.name ?? catName(d.categoryId), value: 0 };
        entry.value += d.amount;
        return m.set(d.categoryId, entry);
      }, new Map<string, { id: string; name: string; value: number }>())
      .values()
  );
  // Planned moves to another account (saving, investing); category moves inside one account move no money.
  const plannedTransfers = Array.from(
    budget.definitions
      .filter((d) => d.type === "TRANSFER" && d.fromAccountId && d.toAccountId && d.fromAccountId !== d.toAccountId)
      .reduce((m, d) => {
        const key = `t:${d.categoryId}:${d.toAccountId}`;
        const entry = m.get(key) ?? {
          id: key,
          name: d.category?.name ?? catName(d.categoryId),
          value: 0,
          kind: "transfer" as const,
          detail: d.toAccount ? `to ${d.toAccount.name}` : undefined,
        };
        entry.value += d.amount;
        return m.set(key, entry);
      }, new Map<string, { id: string; name: string; value: number; kind: "transfer"; detail?: string }>())
      .values()
  );

  // Account impact: what each account gains or loses per month under this plan.
  const accountMap = new Map<
    string,
    { name: string; income: number; spending: number; transferIn: number; transferOut: number }
  >();
  const touch = (acc: Account) =>
    accountMap.get(acc.id) ?? { name: acc.name, income: 0, spending: 0, transferIn: 0, transferOut: 0 };
  for (const d of budget.definitions) {
    if (d.type === "INCOME" && d.toAccountId && d.toAccount) {
      const acc = touch(d.toAccount);
      acc.income += d.amount;
      accountMap.set(d.toAccount.id, acc);
    }
    if (d.type === "SPENDING" && d.fromAccountId && d.fromAccount) {
      const acc = touch(d.fromAccount);
      acc.spending += d.amount;
      accountMap.set(d.fromAccount.id, acc);
    }
    if (d.type === "TRANSFER") {
      if (d.fromAccountId && d.fromAccount) {
        const acc = touch(d.fromAccount);
        acc.transferOut += d.amount;
        accountMap.set(d.fromAccount.id, acc);
      }
      if (d.toAccountId && d.toAccount) {
        const acc = touch(d.toAccount);
        acc.transferIn += d.amount;
        accountMap.set(d.toAccount.id, acc);
      }
    }
  }
  const accountRows = Array.from(accountMap.entries()).map(([aid, a]) => ({
    id: aid,
    ...a,
    net: a.income + a.transferIn - a.spending - a.transferOut,
  }));

  const lineMeta = (d: Definition) => {
    const cat = d.category?.name ?? catName(d.categoryId);
    if (d.type === "TRANSFER") {
      const toCat = d.toCategoryId && d.toCategoryId !== d.categoryId ? catName(d.toCategoryId) : null;
      return {
        title: d.description || (toCat ? `${cat} → ${toCat}` : cat),
        category: toCat ? `${cat} → ${toCat}` : cat,
        account:
          d.fromAccount || d.toAccount
            ? `${d.fromAccount?.name ?? "—"} → ${d.toAccount?.name ?? "—"}`
            : null,
      };
    }
    const acc = d.type === "INCOME" ? d.toAccount?.name : d.fromAccount?.name;
    return { title: d.description || cat, category: cat, account: acc ?? null };
  };

  const openAdd = () => {
    setEditingDefId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title={budget.name}
        back={{ href: "/budgets", label: "Budget templates" }}
        action={
          !editingName && (
            <button
              onClick={() => setEditingName(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-fg-2 border border-line-strong rounded-xl hover:bg-surface-2 transition-colors"
            >
              <Pencil size={14} aria-hidden="true" /> Rename
            </button>
          )
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {editingName && (
        <form onSubmit={handleSaveName} className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
          <label htmlFor="template-name" className={labelCls}>Template name</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${inputCls} sm:flex-1`}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded-xl disabled:opacity-50 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingName(false);
                  setName(budget.name);
                }}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Monthly totals */}
      <section aria-label="Monthly totals" className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Income</p>
            <p className="mt-1 font-mono text-[17px] sm:text-2xl font-semibold text-pos tabular-nums truncate">
              {fmtWhole(income)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Spending</p>
            <p className="mt-1 font-mono text-[17px] sm:text-2xl font-semibold text-fg tabular-nums truncate">
              {fmtWhole(spending)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Net</p>
            <p
              className={`mt-1 font-mono text-[17px] sm:text-2xl font-semibold tabular-nums truncate ${
                net >= 0 ? "text-pos" : "text-neg"
              }`}
            >
              {net >= 0 ? "+" : "-"}
              {fmtWhole(net)}
            </p>
          </div>
        </div>
        <p className="mt-3 pt-3 border-t border-line text-xs text-muted">
          Planned per month
          {transfers > 0 && <> · {fmt(transfers)} moved between accounts</>}
        </p>
      </section>

      {/* Where the planned spending goes */}
      <section aria-labelledby="plan-ring-heading" className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
        <h2 id="plan-ring-heading" className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted mb-4">
          Where the plan sends your money
        </h2>
        <SpendingRing
          items={[...plannedByCategory, ...plannedTransfers]}
          totalLabel="Planned out"
          emptyText="Add spending or transfer lines to see where this plan sends your money."
        />
      </section>

      {/* Template lines */}
      <section aria-labelledby="lines-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lines-heading" className="text-lg font-semibold text-fg">
            Lines <span className="text-muted font-normal">({budget.definitions.length})</span>
          </h2>
          {!showForm && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" /> Add line
            </button>
          )}
        </div>

        {showForm && (
          <div className="bg-surface rounded-2xl border border-line overflow-hidden">
            <h3 className="px-4 sm:px-5 pt-4 pb-3 bg-surface-2 text-sm font-semibold text-fg">New line</h3>
            <DefinitionForm
              idPrefix="new-def"
              form={form}
              setForm={setForm}
              categories={categories}
              accounts={accounts}
              submitLabel="Add line"
              onSubmit={handleAddDefinition}
              onCancel={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            />
          </div>
        )}

        {budget.definitions.length === 0 && !showForm && (
          <div className="border border-dashed border-line-strong rounded-2xl p-6 text-center">
            <p className="text-sm text-muted">No lines yet. Add your expected income and spending.</p>
            <button onClick={openAdd} className="mt-2 text-sm font-medium text-accent hover:text-accent-hover">
              Add the first line
            </button>
          </div>
        )}

        {SECTIONS.map(({ type, title }) => {
          const defs = budget.definitions.filter((d) => d.type === type);
          if (defs.length === 0) return null;
          const total = defs.reduce((s, d) => s + d.amount, 0);
          return (
            <div key={type} className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="flex items-baseline justify-between px-4 py-2.5 bg-surface-2 border-b border-line">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {title} · {defs.length}
                </h3>
                <span className="font-mono text-xs text-muted tabular-nums">{fmt(total)}</span>
              </div>
              <ul role="list" className="divide-y divide-line">
                {defs.map((d) => {
                  if (editingDefId === d.id) {
                    return (
                      <li key={d.id}>
                        <DefinitionForm
                          idPrefix={`edit-${d.id}`}
                          form={editForm}
                          setForm={setEditForm}
                          categories={categories}
                          accounts={accounts}
                          submitLabel="Save"
                          onSubmit={handleUpdateDef}
                          onCancel={() => setEditingDefId(null)}
                        />
                      </li>
                    );
                  }
                  const m = lineMeta(d);
                  const sub = [m.title !== m.category ? m.category : null, m.account].filter(Boolean).join(" · ");
                  return (
                    <li key={d.id} className="flex items-center gap-2 pl-4 pr-2 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-medium text-fg leading-snug break-words">{m.title}</p>
                        {sub && <p className="text-xs text-muted break-words">{sub}</p>}
                      </div>
                      {confirmDeleteId === d.id ? (
                        <ConfirmDelete
                          onConfirm={() => handleDeleteDef(d.id)}
                          onCancel={() => setConfirmDeleteId(null)}
                          label="Delete?"
                        />
                      ) : (
                        <>
                          <span
                            className={`font-mono text-[15px] font-semibold tabular-nums whitespace-nowrap ${
                              d.type === "INCOME" ? "text-pos" : "text-fg"
                            }`}
                          >
                            {d.type === "INCOME" ? "+" : d.type === "SPENDING" ? "-" : ""}
                            {fmt(d.amount)}
                          </span>
                          <div className="flex shrink-0">
                            <button
                              onClick={() => startEditDef(d)}
                              aria-label={`Edit ${m.title}`}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
                            >
                              <Pencil size={15} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(d.id)}
                              aria-label={`Delete ${m.title}`}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-neg hover:bg-surface-2"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      {/* Account impact */}
      {accountRows.length > 0 && (
        <section aria-labelledby="impact-heading" className="bg-surface rounded-2xl border border-line overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-line">
            <h2 id="impact-heading" className="text-lg font-semibold text-fg">Account impact</h2>
            <p className="text-xs text-muted mt-0.5">How much each account gains or loses in a month on this plan.</p>
          </div>
          <table className="stack-sm w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Account</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Income</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Spending</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Transfers in</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Transfers out</th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Net</th>
              </tr>
            </thead>
            <tbody>
              {accountRows.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td data-primary data-label="" className="px-4 py-3 font-medium text-fg">{a.name}</td>
                  <td data-label="Income" className="px-4 py-3 text-right font-mono text-pos">
                    {a.income > 0 ? fmt(a.income) : ""}
                  </td>
                  <td data-label="Spending" className="px-4 py-3 text-right font-mono text-neg">
                    {a.spending > 0 ? fmt(a.spending) : ""}
                  </td>
                  <td data-label="Transfers in" className="px-4 py-3 text-right font-mono text-muted">
                    {a.transferIn > 0 ? fmt(a.transferIn) : ""}
                  </td>
                  <td data-label="Transfers out" className="px-4 py-3 text-right font-mono text-muted">
                    {a.transferOut > 0 ? fmt(a.transferOut) : ""}
                  </td>
                  <td
                    data-label="Net"
                    className={`px-4 py-3 text-right font-mono font-medium ${a.net >= 0 ? "text-pos" : "text-neg"}`}
                  >
                    {a.net >= 0 ? "+" : "-"}
                    {fmt(a.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Months using this template */}
      {budget.months.length > 0 && (
        <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-fg mb-3">Used by {budget.months.length === 1 ? "1 month" : `${budget.months.length} months`}</h2>
          <div className="flex flex-wrap gap-2">
            {budget.months.map((m) => (
              <Link
                key={m.id}
                href={`/months/${m.id}`}
                className="px-3 py-1.5 text-sm font-medium text-fg-2 bg-surface-2 rounded-xl hover:bg-line transition-colors"
              >
                {MONTHS[m.month - 1].slice(0, 3)} {m.year}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
