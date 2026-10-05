"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { getAccounts, getCategories, getMonths, createMonth, createTransaction } from "@/lib/api";
import { fmt } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import TransactionForm from "@/components/TransactionForm";

const OPEN_EVENT = "lh:quick-add";
/** Fired after a transaction is added so open pages can reload. */
export const TRANSACTIONS_CHANGED = "lh:transactions-changed";

export function openQuickAdd() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function QuickAddButton() {
  return (
    <button
      type="button"
      onClick={openQuickAdd}
      className="flex items-center gap-2 h-12 px-4 shrink-0 rounded-xl bg-accent text-accent-ink text-sm font-semibold hover:bg-accent-hover transition-colors"
    >
      <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
      <span className="hidden sm:inline">New transaction</span>
      <span className="sr-only sm:hidden">New transaction</span>
    </button>
  );
}

/** Dialog for adding a transaction from anywhere; files it into the right month, creating the month if needed. */
export function QuickAddTransaction() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [months, setMonths] = useState<any[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    async function open() {
      setError("");
      setFormKey((k) => k + 1);
      dialogRef.current?.showModal();
      try {
        const [a, c, m] = await Promise.all([getAccounts(), getCategories(), getMonths()]);
        setAccounts(a ?? []);
        setCategories(c ?? []);
        setMonths(m ?? []);
      } catch (e: any) {
        setError(e.message);
      }
    }
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  // Start typing the amount right away once the form is ready.
  useEffect(() => {
    if (accounts.length && dialogRef.current?.open) document.getElementById("tx-amount")?.focus();
  }, [accounts, formKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const close = () => dialogRef.current?.close();

  async function save(data: any) {
    setSaving(true);
    setError("");
    try {
      const year = Number(data.date.slice(0, 4));
      const month = Number(data.date.slice(5, 7));
      let target = months.find((m) => m.year === year && m.month === month);
      if (!target) {
        target = await createMonth({ month, year });
        setMonths((ms) => [...ms, target]);
      }
      await createTransaction({ ...data, monthId: target.id });
      close();
      const sign = data.type === "INCOME" ? "+" : data.type === "SPENDING" ? "−" : "";
      setToast(`Added ${sign}${fmt(data.amount)}${data.description ? ` · ${data.description}` : ""} to ${MONTH_NAMES[month - 1]}`);
      window.dispatchEvent(new Event(TRANSACTIONS_CHANGED));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby="quick-add-title"
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-surface text-fg p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="quick-add-title" className="text-lg font-semibold tracking-tight">New transaction</h2>
            <button type="button" onClick={close} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-muted">Filed into the month of its date. The month is created if it doesn&apos;t exist yet.</p>
          {error && (
            <p role="alert" className="text-sm text-neg">{error}</p>
          )}
          {accounts.length === 0 && !error ? (
            <p className="text-sm text-muted">Loading accounts…</p>
          ) : (
            <TransactionForm
              key={formKey}
              accounts={accounts}
              categories={categories}
              monthId=""
              defaultStatus="PAID"
              saving={saving}
              onSave={save}
              onCancel={close}
            />
          )}
        </div>
      </dialog>

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 -translate-x-1/2 lg:left-[calc(50%+8rem)] z-50 px-4 py-3 rounded-xl bg-fg text-canvas text-sm font-medium shadow-xl">
          {toast}
        </div>
      )}
    </>
  );
}
