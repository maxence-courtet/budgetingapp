"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { getBudgets, createBudget, deleteBudget } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";

interface BudgetTemplate {
  id: string;
  name: string;
  createdAt: string;
  definitions: any[];
  months: any[];
  definitionCount?: number;
  monthsUsedCount?: number;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createBudget({ name: newName.trim() });
      setNewName("");
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      setDeleting(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return <LoadingState message="Loading budget templates..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budget templates"
        back={{ href: "/settings", label: "Settings" }}
        action={
          !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" /> New template
            </button>
          )
        }
      />

      <p className="-mt-3 text-sm text-muted max-w-prose">
        A template is the plan a month starts from: expected income, spending per category and transfers between accounts.
      </p>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-surface rounded-2xl border border-line p-4 sm:p-5">
          <label htmlFor="budget-name" className="block text-sm font-medium text-fg-2 mb-1">
            Template name
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="budget-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Budget 2025"
              className="w-full sm:flex-1 px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!newName.trim()}
                className="flex-1 sm:flex-none px-4 py-2 bg-accent hover:bg-accent-hover text-accent-ink text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewName("");
                }}
                className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          message="No budget templates yet."
          cta={showForm ? undefined : { label: "Create your first template", onClick: () => setShowForm(true) }}
        />
      ) : (
        <ul role="list" className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
          {budgets.map((b) => {
            const lines = b.definitionCount ?? b.definitions?.length ?? 0;
            const months = b.monthsUsedCount ?? b.months?.length ?? 0;
            return (
              <li key={b.id} className="flex items-center gap-2 pl-4 pr-2 py-3">
                <Link href={`/budgets/${b.id}`} className="flex-1 min-w-0 flex items-center gap-2 group py-0.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-medium text-fg leading-snug break-words group-hover:underline">
                      {b.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {plural(lines, "line")} · {months === 0 ? "not used yet" : `used by ${plural(months, "month")}`}
                    </span>
                  </span>
                  {deleting !== b.id && (
                    <ChevronRight size={16} className="text-faint shrink-0 sm:hidden" aria-hidden="true" />
                  )}
                </Link>
                {deleting === b.id ? (
                  <ConfirmDelete
                    onConfirm={() => handleDelete(b.id)}
                    onCancel={() => setDeleting(null)}
                    label="Delete?"
                  />
                ) : (
                  <button
                    onClick={() => setDeleting(b.id)}
                    aria-label={`Delete ${b.name}`}
                    className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-muted hover:text-neg hover:bg-surface-2"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
