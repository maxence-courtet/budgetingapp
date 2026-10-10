"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus, Pencil, Trash2, Landmark, PiggyBank, CreditCard, Banknote, TrendingUp } from "lucide-react";

function AccountIcon({ type }: { type: string }) {
  const Icon =
    type === "savings" ? PiggyBank : type === "credit card" ? CreditCard : type === "cash" ? Banknote : type === "investment" ? TrendingUp : Landmark;
  return <Icon size={18} className="text-muted" aria-hidden="true" />;
}

const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit card",
  "cash",
  "investment",
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("checking");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormType("checking");
    setFormNotes("");
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await createAccount({
        name: formName.trim(),
        type: formType,
        notes: formNotes.trim() || undefined,
      });
      setError("");
      resetForm();
      await loadAccounts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (account: any) => {
    setEditingId(account.id);
    setFormName(account.name);
    setFormType(String(account.type).toLowerCase().replace(/_/g, " "));
    setFormNotes(account.notes ?? "");
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !formName.trim()) return;
    setSaving(true);
    try {
      await updateAccount(editingId, {
        name: formName.trim(),
        type: formType,
        notes: formNotes.trim() || null, // null clears the notes
      });
      setError("");
      resetForm();
      await loadAccounts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
      setDeleteConfirm(null);
      setError("");
      await loadAccounts();
    } catch (e: any) {
      setDeleteConfirm(null);
      setError(e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading accounts..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Accounts"
        back={{ href: "/settings", label: "Settings" }}
        action={
          !showCreate &&
          !editingId && (
            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" /> New account
            </button>
          )
        }
      />

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Create Form */}
      {(showCreate || editingId) && (
        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">
            {editingId ? "Edit account" : "New account"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="account-name" className="block text-sm font-medium text-fg-2 mb-1">
                Name
              </label>
              <input
                id="account-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Account name"
              />
            </div>
            <div>
              <label htmlFor="account-type" className="block text-sm font-medium text-fg-2 mb-1">
                Type
              </label>
              <select
                id="account-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              {formType === "investment" && (
                <p className="mt-1 text-xs text-muted">Shows on the Investments page, where you log its trades and fees.</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="account-notes" className="block text-sm font-medium text-fg-2 mb-1">
                Notes
              </label>
              <textarea
                id="account-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={saving || !formName.trim()}
              className="px-4 py-2.5 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Save" : "Create account"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accounts */}
      {accounts.length === 0 ? (
        <EmptyState
          message="No accounts yet."
          cta={{
            label: "Create your first account",
            onClick: () => {
              resetForm();
              setShowCreate(true);
            },
          }}
        />
      ) : (
        <ul role="list" className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {accounts.map((a: any) => {
            const type = String(a.type ?? "").replace("_", " ").toLowerCase();
            const balance = a.balance ?? 0;
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                <Link href={`/accounts/${a.id}`} className="flex-1 min-w-0 flex items-center gap-3 group">
                  <span className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-surface-2 items-center justify-center">
                    <AccountIcon type={type} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium text-fg leading-snug break-words group-hover:underline">{a.name}</span>
                    <span className="block text-xs text-muted capitalize">{type}</span>
                  </span>
                </Link>
                <span className={`text-[15px] font-semibold tabular-nums ${balance >= 0 ? "text-fg" : "text-neg"}`}>
                  {balance < 0 ? "-" : ""}
                  {fmt(balance)}
                </span>
                {deleteConfirm === a.id ? (
                  <ConfirmDelete
                    onConfirm={() => handleDelete(a.id)}
                    onCancel={() => setDeleteConfirm(null)}
                    label="Delete?"
                  />
                ) : (
                  <div className="flex shrink-0">
                    <button
                      onClick={() => startEdit(a)}
                      aria-label={`Edit ${a.name}`}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(a.id)}
                      aria-label={`Delete ${a.name}`}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-neg hover:bg-surface-2"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
