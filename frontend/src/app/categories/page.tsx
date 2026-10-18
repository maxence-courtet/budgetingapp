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
import { PageHeader } from "@/components/ui/PageHeader";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        back={{ href: "/settings", label: "Settings" }}
        action={
          !showCreate &&
          !editingId && (
            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded-xl transition-colors"
            >
              <Plus size={16} aria-hidden="true" /> New category
            </button>
          )
        }
      />

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">
            New category
          </h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-full sm:min-w-0">
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
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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

      {/* Categories */}
      {categories.length === 0 ? (
        <EmptyState message="No categories yet." />
      ) : (
        <ul role="list" className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {categories.map((cat: any) => {
            const count = cat.transactionCount ?? cat._count?.transactions ?? 0;
            if (editingId === cat.id) {
              return (
                <li key={cat.id} className="flex flex-wrap items-center gap-2 px-4 py-3 bg-surface-2">
                  <label className="sr-only" htmlFor={`edit-${cat.id}`}>Name</label>
                  <input
                    id={`edit-${cat.id}`}
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, handleUpdate)}
                    className="flex-1 min-w-[10rem] border border-line-strong rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdate}
                    disabled={saving || !formName.trim()}
                    className="px-3 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-accent-ink rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-3 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-lg hover:bg-surface transition-colors"
                  >
                    Cancel
                  </button>
                </li>
              );
            }
            return (
              <li key={cat.id} className="flex items-center gap-3 pl-4 pr-2 py-2.5 min-h-[3.25rem]">
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-medium text-fg truncate">{cat.name}</span>
                  <span className="block text-xs text-muted">
                    {count} transaction{count === 1 ? "" : "s"}
                  </span>
                </span>
                {deleteConfirm === cat.id ? (
                  <ConfirmDelete
                    onConfirm={() => handleDelete(cat.id)}
                    onCancel={() => setDeleteConfirm(null)}
                    label={count > 0 ? "In use. Delete?" : "Delete?"}
                  />
                ) : (
                  <div className="flex shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      aria-label={`Rename ${cat.name}`}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(cat.id)}
                      aria-label={`Delete ${cat.name}`}
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
