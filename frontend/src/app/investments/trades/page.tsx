"use client";

import { localISO } from "@/lib/date";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
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

function totalCost(quantity: number, price: number, fees: number) {
  return quantity * price + fees;
}

function tradeBadge(type: string) {
  return type === "BUY" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
      BUY
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
      SELL
    </span>
  );
}

function assetBadge(type: string) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-2 text-fg-2">
      {type}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
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

  const investmentAccounts = accounts.filter((a) => a.type === "investment");

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
        notes: editForm.notes.trim() || undefined,
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
      setError(e.message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState message="Loading trades..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trade Log"
        action={
          !showCreate && !editingId ? (
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreate(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={15} aria-hidden="true" />
              New Trade
            </button>
          ) : null
        }
      />

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* ── Create form ─────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">New Trade</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ticker */}
            <div>
              <label htmlFor="create-ticker" className="block text-sm font-medium text-muted mb-1">
                Ticker
              </label>
              <input
                id="create-ticker"
                type="text"
                value={form.ticker}
                onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="e.g. AAPL"
              />
            </div>

            {/* Asset Type */}
            <div>
              <label htmlFor="create-assetType" className="block text-sm font-medium text-muted mb-1">
                Asset Type
              </label>
              <select
                id="create-assetType"
                value={form.assetType}
                onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Trade Type */}
            <div>
              <label htmlFor="create-tradeType" className="block text-sm font-medium text-muted mb-1">
                Trade Type
              </label>
              <div className="flex rounded-xl overflow-hidden border border-line-strong text-sm font-medium h-[38px]">
                {TRADE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tradeType: t }))}
                    className={`flex-1 transition-colors ${
                      form.tradeType === t
                        ? t === "BUY"
                          ? "bg-green-600 text-accent-ink"
                          : "bg-red-600 text-accent-ink"
                        : "bg-surface text-muted hover:bg-surface-2"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Account */}
            <div>
              <label htmlFor="create-accountId" className="block text-sm font-medium text-muted mb-1">
                Account
              </label>
              <select
                id="create-accountId"
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">— None —</option>
                {investmentAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="create-date" className="block text-sm font-medium text-muted mb-1">
                Date
              </label>
              <input
                id="create-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="create-quantity" className="block text-sm font-medium text-muted mb-1">
                Quantity
              </label>
              <input
                id="create-quantity"
                type="number"
                min="0"
                step="0.000001"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.000000"
              />
            </div>

            {/* Price per Unit */}
            <div>
              <label htmlFor="create-price" className="block text-sm font-medium text-muted mb-1">
                Price per Unit
              </label>
              <input
                id="create-price"
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerUnit}
                onChange={(e) => setForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </div>

            {/* Fees */}
            <div>
              <label htmlFor="create-fees" className="block text-sm font-medium text-muted mb-1">
                Fees <span className="text-faint font-normal">(optional)</span>
              </label>
              <input
                id="create-fees"
                type="number"
                min="0"
                step="0.01"
                value={form.fees}
                onChange={(e) => setForm((f) => ({ ...f, fees: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="0.00"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="create-notes" className="block text-sm font-medium text-muted mb-1">
                Notes <span className="text-faint font-normal">(optional)</span>
              </label>
              <textarea
                id="create-notes"
                rows={1}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleCreate}
              disabled={saving || !form.ticker.trim() || !form.quantity || !form.pricePerUnit}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Create Trade"}
            </button>
            <button
              onClick={resetCreateForm}
              className="px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Trades table ────────────────────────────────────────────────── */}
      {trades.length === 0 ? (
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
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Trade log">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Date</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Ticker</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Type</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Asset</th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Qty</th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Price</th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Fees</th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Total</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Account</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Notes</th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) =>
                  editingId === trade.id ? (
                    /* ── Inline edit row ─────────────────────────────── */
                    <tr key={trade.id} className="border-b border-line bg-surface-2">
                      {/* Date */}
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                          className="w-32 border border-line-strong rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      {/* Ticker */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.ticker}
                          onChange={(e) => setEditForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                          className="w-20 border border-line-strong rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      {/* Trade Type toggle */}
                      <td className="px-4 py-2">
                        <div className="flex rounded overflow-hidden border border-line-strong text-xs font-medium">
                          {TRADE_TYPES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setEditForm((f) => ({ ...f, tradeType: t }))}
                              className={`px-2 py-1 transition-colors ${
                                editForm.tradeType === t
                                  ? t === "BUY"
                                    ? "bg-green-600 text-accent-ink"
                                    : "bg-red-600 text-accent-ink"
                                  : "bg-surface text-muted"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </td>
                      {/* Asset Type */}
                      <td className="px-4 py-2">
                        <select
                          value={editForm.assetType}
                          onChange={(e) => setEditForm((f) => ({ ...f, assetType: e.target.value }))}
                          className="border border-line-strong rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          {ASSET_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      {/* Quantity */}
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.000001"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                          className="w-24 border border-line-strong rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      {/* Price */}
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.pricePerUnit}
                          onChange={(e) => setEditForm((f) => ({ ...f, pricePerUnit: e.target.value }))}
                          className="w-24 border border-line-strong rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      {/* Fees */}
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editForm.fees}
                          onChange={(e) => setEditForm((f) => ({ ...f, fees: e.target.value }))}
                          className="w-20 border border-line-strong rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </td>
                      {/* Total (computed, read-only) */}
                      <td className="px-4 py-2 text-right text-muted tabular-nums text-xs">
                        {editForm.quantity && editForm.pricePerUnit
                          ? fmt(totalCost(
                              parseFloat(editForm.quantity),
                              parseFloat(editForm.pricePerUnit),
                              parseFloat(editForm.fees || "0"),
                            ))
                          : "—"}
                      </td>
                      {/* Account */}
                      <td className="px-4 py-2">
                        <select
                          value={editForm.accountId}
                          onChange={(e) => setEditForm((f) => ({ ...f, accountId: e.target.value }))}
                          className="border border-line-strong rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          <option value="">— None —</option>
                          {investmentAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </td>
                      {/* Notes */}
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editForm.notes}
                          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                          className="w-32 border border-line-strong rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                          placeholder="Notes"
                        />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleUpdate}
                            disabled={saving || !editForm.ticker.trim() || !editForm.quantity || !editForm.pricePerUnit}
                            className="px-3 py-1 text-xs font-medium bg-accent text-accent-ink rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded hover:bg-surface-2 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* ── Normal display row ──────────────────────────── */
                    <tr key={trade.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 text-fg-2 whitespace-nowrap">
                        {trade.date?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-fg">
                        {trade.ticker}
                      </td>
                      <td className="px-4 py-3">{tradeBadge(trade.tradeType)}</td>
                      <td className="px-4 py-3">{assetBadge(trade.assetType)}</td>
                      <td className="px-4 py-3 text-right text-fg-2 tabular-nums">
                        {trade.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                      </td>
                      <td className="px-4 py-3 text-right text-fg-2 tabular-nums">
                        {fmt(trade.pricePerUnit)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted tabular-nums">
                        {fmt(trade.fees ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-fg tabular-nums">
                        {fmt(totalCost(trade.quantity, trade.pricePerUnit, trade.fees ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {trade.account?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted max-w-[140px] truncate">
                        {trade.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deleteConfirm === trade.id ? (
                          <ConfirmDelete
                            label="Delete trade?"
                            onConfirm={() => handleDelete(trade.id)}
                            onCancel={() => setDeleteConfirm(null)}
                          />
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => startEdit(trade)}
                              className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded hover:bg-surface-2 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(trade.id)}
                              className="px-3 py-1 text-xs font-medium border border-red-300 text-neg rounded hover:bg-red-50 transition-colors"
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
        </div>
      )}
    </div>
  );
}
