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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">Accounts</h1>
        {!showCreate && !editingId && (
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
          >
            New Account
          </button>
        )}
      </div>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">
            New Account
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
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Create Account"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accounts Table */}
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
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                  Name
                </th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                  Type
                </th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                  Balance
                </th>
                <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a: any) =>
                editingId === a.id ? (
                  <tr
                    key={a.id}
                    className="border-b border-line bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full border border-line-strong rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full border border-line-strong rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        {ACCOUNT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                      <label className="sr-only" htmlFor={`edit-notes-${a.id}`}>Notes</label>
                      <input
                        id={`edit-notes-${a.id}`}
                        type="text"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Notes"
                        className="mt-1 w-full border border-line-strong rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {fmt(a.balance ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleUpdate}
                          disabled={saving || !formName.trim()}
                          className="px-3 py-1 text-xs font-medium bg-accent text-accent-ink rounded hover:bg-accent-hover disabled:opacity-50 transition-colors"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={resetForm}
                          className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded hover:bg-surface-2 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={a.id}
                    className="border-b border-line last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/accounts/${a.id}`}
                        className="text-fg font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted capitalize">
                      {String(a.type ?? "").replace("_", " ").toLowerCase()}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        (a.balance ?? 0) >= 0
                          ? "text-pos"
                          : "text-neg"
                      }`}
                    >
                      {(a.balance ?? 0) < 0 ? "-" : ""}
                      {fmt(a.balance ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === a.id ? (
                        <ConfirmDelete
                          onConfirm={() => handleDelete(a.id)}
                          onCancel={() => setDeleteConfirm(null)}
                          label="Delete account?"
                        />
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(a)}
                            className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded hover:bg-surface-2 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(a.id)}
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
      )}
    </div>
  );
}
