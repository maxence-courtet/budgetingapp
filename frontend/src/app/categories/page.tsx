"use client";

import { useState, useEffect } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const resetForm = () => {
    setFormName("");
    setShowCreate(false);
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await createCategory({ name: formName.trim() });
      resetForm();
      await loadCategories();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setShowCreate(false);
    setDeleteConfirm(null);
  };

  const handleUpdate = async () => {
    if (!editingId || !formName.trim()) return;
    setSaving(true);
    try {
      await updateCategory(editingId, { name: formName.trim() });
      resetForm();
      await loadCategories();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      setDeleteConfirm(null);
      await loadCategories();
    } catch (e: any) {
      setError(e.message);
      setDeleteConfirm(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  if (loading) {
    return <LoadingState message="Loading categories..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">Categories</h1>
        {!showCreate && !editingId && (
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded-xl transition-colors"
          >
            New Category
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
            New Category
          </h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label
                htmlFor="category-name"
                className="block text-sm font-medium text-fg-2 mb-1"
              >
                Name
              </label>
              <input
                id="category-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleCreate)}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                placeholder="Category name"
                autoFocus
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Create"}
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

      {/* Categories Table */}
      {categories.length === 0 ? (
        <EmptyState message="No categories yet." />
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th
                  scope="col"
                  className="text-left px-4 py-3 font-medium text-muted"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="text-center px-4 py-3 font-medium text-muted"
                >
                  Transactions
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
              {categories.map((cat: any) =>
                editingId === cat.id ? (
                  <tr
                    key={cat.id}
                    className="border-b border-line bg-surface-2"
                  >
                    <td className="px-4 py-3" colSpan={2}>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, handleUpdate)}
                        className="w-full max-w-xs border border-line-strong rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        autoFocus
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={handleUpdate}
                          disabled={saving || !formName.trim()}
                          className="px-3 py-1 text-xs font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded disabled:opacity-50 transition-colors"
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
                    key={cat.id}
                    className="border-b border-line last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 text-fg font-medium">
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-center text-muted">
                      {cat.transactionCount ?? cat._count?.transactions ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {deleteConfirm === cat.id ? (
                        <div className="flex justify-end items-center gap-2">
                          {(cat.transactionCount ??
                            cat._count?.transactions ??
                            0) > 0 && (
                            <span className="text-xs text-amber-600 mr-2">
                              This category is in use!
                            </span>
                          )}
                          <ConfirmDelete
                            onConfirm={() => handleDelete(cat.id)}
                            onCancel={() => setDeleteConfirm(null)}
                            label="Delete category?"
                          />
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(cat)}
                            className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded hover:bg-surface-2 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(cat.id)}
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
