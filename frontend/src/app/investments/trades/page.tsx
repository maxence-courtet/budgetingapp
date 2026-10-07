"use client";

import { localISO } from "@/lib/date";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  getTrades,
  getAccounts,
  createTrade,
  updateTrade,
  deleteTrade,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Trade {
  id: string;
  ticker: string;
  assetType: string;
  tradeType: string;
  quantity: number;
  pricePerUnit: number;
  fees: number;
  date: string;
  notes?: string;
  account: { id: string; name: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ASSET_TYPES = ["STOCK", "ETF", "CRYPTO", "OTHER"] as const;
const TRADE_TYPES = ["BUY", "SELL"] as const;

/** A fresh form; the date is today in the user's timezone, computed when the form is reset. */
const blankForm = () => ({
  ticker: "",
  assetType: "STOCK",
  tradeType: "BUY",
  accountId: "",
  date: localISO(),
  quantity: "",
  pricePerUnit: "",
  fees: "",
  notes: "",
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** What a buy cost (fees added) or a sell brought in (fees taken off). */
function totalCost(quantity: number, price: number, fees: number, tradeType = "BUY") {
  return tradeType === "SELL" ? quantity * price - fees : quantity * price + fees;
}

type TradeForm = ReturnType<typeof blankForm>;

const inputCls =
  "w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent";
const labelCls = "block text-sm font-medium text-muted mb-1";

function formValid(f: TradeForm) {
  return Boolean(f.ticker.trim() && f.quantity && f.pricePerUnit);
}

/** The fields of a trade, shared by the new-trade card and the edit card. One column on phones. */
function TradeFields({
  idPrefix,
  form,
  setForm,
  accounts,
  showAccountTip,
}: {
  idPrefix: string;
  form: TradeForm;
  setForm: (fn: (f: TradeForm) => TradeForm) => void;
  accounts: Account[];
  showAccountTip: boolean;
}) {
  const set = (key: keyof TradeForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const total =
    form.quantity && form.pricePerUnit
      ? totalCost(parseFloat(form.quantity), parseFloat(form.pricePerUnit), parseFloat(form.fees || "0"), form.tradeType)
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <span className={labelCls} id={`${idPrefix}-tradeType-label`}>Trade</span>
        <div
          role="radiogroup"
          aria-labelledby={`${idPrefix}-tradeType-label`}
          className="flex p-1 rounded-xl bg-surface-2"
        >
          {TRADE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={form.tradeType === t}
              onClick={() => setForm((f) => ({ ...f, tradeType: t }))}
              className={`flex-1 h-8 rounded-lg text-[13px] font-medium transition-colors ${
                form.tradeType === t
                  ? `bg-surface shadow-sm ${t === "BUY" ? "text-pos" : "text-neg"}`
                  : "text-muted hover:text-fg"
              }`}
            >
              {t === "BUY" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-ticker`} className={labelCls}>Ticker</label>
        <input
          id={`${idPrefix}-ticker`}
          type="text"
          autoCapitalize="characters"
          value={form.ticker}
          onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
          className={inputCls}
          placeholder="e.g. AAPL"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-assetType`} className={labelCls}>Asset type</label>
        <select id={`${idPrefix}-assetType`} value={form.assetType} onChange={set("assetType")} className={inputCls}>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-quantity`} className={labelCls}>Quantity</label>
        <input
          id={`${idPrefix}-quantity`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.000001"
          value={form.quantity}
          onChange={set("quantity")}
          className={inputCls}
          placeholder="0"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-price`} className={labelCls}>Price per unit</label>
        <input
          id={`${idPrefix}-price`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.pricePerUnit}
          onChange={set("pricePerUnit")}
          className={inputCls}
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-fees`} className={labelCls}>
          Fees <span className="text-faint font-normal">(optional)</span>
        </label>
        <input
          id={`${idPrefix}-fees`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.fees}
          onChange={set("fees")}
          className={inputCls}
          placeholder="0.00"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-date`} className={labelCls}>Date</label>
        <input id={`${idPrefix}-date`} type="date" value={form.date} onChange={set("date")} className={inputCls} />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-accountId`} className={labelCls}>Account</label>
        <select id={`${idPrefix}-accountId`} value={form.accountId} onChange={set("accountId")} className={inputCls}>
          <option value="">Choose an account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {showAccountTip && (
          <p className="mt-1 text-xs text-muted">
            Tip: add an account of type “Investment” on the Accounts page to keep trades separate.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${idPrefix}-notes`} className={labelCls}>
          Notes <span className="text-faint font-normal">(optional)</span>
        </label>
        <input
          id={`${idPrefix}-notes`}
          type="text"
          value={form.notes}
          onChange={set("notes")}
          className={inputCls}
          placeholder="Optional notes"
        />
      </div>

      <p className="sm:col-span-2 lg:col-span-3 text-sm text-muted" aria-live="polite">
        {form.tradeType === "SELL" ? "You receive" : "Total cost"}{" "}
        <span className="font-mono font-semibold text-fg">{total == null || isNaN(total) ? "—" : fmt(total)}</span>
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filterTicker, setFilterTicker] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(blankForm());

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(blankForm());

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [tradesData, accountsData] = await Promise.all([
        getTrades(),
        getAccounts(),
      ]);
      setTrades(Array.isArray(tradesData) ? tradesData : []);
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Prefer investment accounts; with none yet, any account can hold trades.
  const investmentOnly = accounts.filter((a) => String(a.type).toLowerCase() === "investment");
  const investmentAccounts = investmentOnly.length ? investmentOnly : accounts;

  // ── Create ────────────────────────────────────────────────────────────────

  const resetCreateForm = () => {
    setForm(blankForm());
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!form.ticker.trim() || !form.quantity || !form.pricePerUnit) return;
    setSaving(true);
    setError("");
    try {
      await createTrade({
        ticker: form.ticker.trim().toUpperCase(),
        assetType: form.assetType,
        tradeType: form.tradeType,
        accountId: form.accountId || undefined,
        date: form.date,
        quantity: parseFloat(form.quantity),
        pricePerUnit: parseFloat(form.pricePerUnit),
        fees: parseFloat(form.fees || "0"),
        notes: form.notes.trim() || undefined,
      });
      resetCreateForm();
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const startEdit = (trade: Trade) => {
    setEditingId(trade.id);
    setEditForm({
      ticker: trade.ticker,
      assetType: trade.assetType,
      tradeType: trade.tradeType,
      accountId: trade.account?.id ?? "",
      date: trade.date?.slice(0, 10) ?? "",
      quantity: String(trade.quantity),
      pricePerUnit: String(trade.pricePerUnit),
      fees: String(trade.fees ?? 0),
      notes: trade.notes ?? "",
    });
    setShowCreate(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(blankForm());
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.ticker.trim() || !editForm.quantity || !editForm.pricePerUnit) return;
    setSaving(true);
    setError("");
    try {
      await updateTrade(editingId, {
        ticker: editForm.ticker.trim().toUpperCase(),
        assetType: editForm.assetType,
        tradeType: editForm.tradeType,
        accountId: editForm.accountId || undefined,
        date: editForm.date,
        quantity: parseFloat(editForm.quantity),
        pricePerUnit: parseFloat(editForm.pricePerUnit),
        fees: parseFloat(editForm.fees || "0"),
        notes: editForm.notes.trim() || null, // null clears the note
      });
      cancelEdit();
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await deleteTrade(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (e: any) {
      setDeleteConfirm(null);
      setError(e.message);
    }
  };

  const visibleTrades = trades.filter(
    (t) =>
      (!filterTicker.trim() || t.ticker.includes(filterTicker.trim().toUpperCase())) &&
      (!filterAccount || t.account?.id === filterAccount)
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading trades..." />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trades"
        back={{ href: "/investments", label: "Investments" }}
        action={
          !showCreate && !editingId ? (
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreate(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              New trade
            </button>
          ) : null
        }
      />

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {showCreate && (
        <section aria-labelledby="new-trade-h" className="bg-surface border border-line rounded-2xl p-4 sm:p-6">
          <h2 id="new-trade-h" className="text-base font-semibold text-fg mb-4">New trade</h2>
          <TradeFields
            idPrefix="create"
            form={form}
            setForm={setForm}
            accounts={investmentAccounts}
            showAccountTip={investmentOnly.length === 0}
          />
          <div className="flex gap-2 mt-5">
            <button
              onClick={handleCreate}
              disabled={saving || !formValid(form)}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save trade"}
            </button>
            <button
              onClick={resetCreateForm}
              className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {trades.length === 0 ? (
        !showCreate && (
          <EmptyState
            message="No trades recorded yet."
            cta={{
              label: "Add your first trade",
              onClick: () => {
                resetCreateForm();
                setShowCreate(true);
              },
            }}
          />
        )
      ) : (
        <section aria-label="Trade log" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex-1 min-w-[8rem] sm:flex-none">
              <span className="sr-only">Filter by ticker</span>
              <input
                type="search"
                value={filterTicker}
                onChange={(e) => setFilterTicker(e.target.value)}
                placeholder="Ticker"
                className="block w-full sm:w-40 border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>
            <label className="flex-1 min-w-[8rem] sm:flex-none">
              <span className="sr-only">Filter by account</span>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="block w-full sm:w-52 border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <span className="w-full sm:w-auto sm:ml-auto text-xs text-muted">
              {visibleTrades.length === trades.length
                ? `${trades.length} trade${trades.length === 1 ? "" : "s"}`
                : `${visibleTrades.length} of ${trades.length} trades`}
            </span>
          </div>

          <div className="bg-surface border border-line rounded-2xl overflow-hidden">
            {visibleTrades.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">No trades match these filters.</p>
            ) : (
              <ul role="list" className="divide-y divide-line">
                {visibleTrades.map((trade) => {
                  const date = new Date(trade.date);
                  const isBuy = trade.tradeType === "BUY";
                  const total = totalCost(trade.quantity, trade.pricePerUnit, trade.fees ?? 0, trade.tradeType);

                  if (editingId === trade.id) {
                    return (
                      <li key={trade.id} className="p-4 sm:p-5 bg-surface-2/50">
                        <h3 className="text-sm font-semibold text-fg mb-4">Edit {trade.ticker} trade</h3>
                        <TradeFields
                          idPrefix={`edit-${trade.id}`}
                          form={editForm}
                          setForm={setEditForm}
                          accounts={investmentAccounts}
                          showAccountTip={false}
                        />
                        <div className="flex flex-wrap items-center gap-2 mt-5">
                          <button
                            onClick={handleUpdate}
                            disabled={saving || !formValid(editForm)}
                            className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                          >
                            Cancel
                          </button>
                          <div className="ml-auto">
                            {deleteConfirm === trade.id ? (
                              <ConfirmDelete
                                label="Delete trade?"
                                onConfirm={() => handleDelete(trade.id)}
                                onCancel={() => setDeleteConfirm(null)}
                              />
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(trade.id)}
                                aria-label={`Delete ${trade.ticker} trade`}
                                className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-neg rounded-xl hover:bg-surface-2 transition-colors"
                              >
                                <Trash2 size={15} aria-hidden="true" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={trade.id}>
                      <button
                        type="button"
                        onClick={() => startEdit(trade)}
                        aria-label={`Edit ${trade.tradeType === "BUY" ? "buy" : "sell"} of ${trade.ticker} on ${trade.date?.slice(0, 10)}`}
                        className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left hover:bg-surface-2 transition-colors"
                      >
                        <span className="w-11 shrink-0 text-center leading-none">
                          <span className="block font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                            {date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
                          </span>
                          <span className="block mt-1 text-[17px] font-semibold text-fg">
                            {date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}
                          </span>
                          <span className="block mt-0.5 font-mono text-[10px] text-faint">{date.getUTCFullYear()}</span>
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-2">
                            <span
                              className={`shrink-0 px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold tracking-[0.04em] ${
                                isBuy ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}
                            >
                              {trade.tradeType}
                            </span>
                            <span className="text-[15px] font-semibold text-fg truncate">{trade.ticker}</span>
                            <span className="hidden sm:inline text-xs text-faint">{trade.assetType}</span>
                          </span>
                          <span className="block mt-0.5 text-xs text-muted truncate">
                            {trade.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })} × {fmt(trade.pricePerUnit)}
                            {trade.fees ? <span className="hidden sm:inline"> + {fmt(trade.fees)} fees</span> : null}
                            {trade.account?.name ? ` · ${trade.account.name}` : ""}
                            {trade.notes ? <span className="hidden sm:inline"> · {trade.notes}</span> : null}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-mono text-[15px] font-semibold ${isBuy ? "text-fg" : "text-pos"}`}
                          title={isBuy ? "Total cost" : "Proceeds"}
                        >
                          {isBuy ? "−" : "+"}
                          {fmt(total)}
                        </span>
                        <Pencil size={14} className="hidden sm:block shrink-0 text-faint" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
