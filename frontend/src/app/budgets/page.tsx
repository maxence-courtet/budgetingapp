"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBudgets, createBudget, deleteBudget } from "@/lib/api";

const fmt = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

interface BudgetTemplate {
  id: string;
  name: string;
  createdAt: string;
  definitions: any[];
  months: any[];
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await getBudgets();
      setBudgets(data);
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      setDeleting(null);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Loading budgets...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Budget Templates</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          {showForm ? "Cancel" : "New Budget"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <form onSubmit={handleCreate} className="flex items-center gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Budget template name"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Create
            </button>
          </form>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-500">
            No budget templates yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 flex flex-col justify-between"
            >
              <div>
                <Link
                  href={`/budgets/${b.id}`}
                  className="text-lg font-semibold text-slate-900 hover:text-slate-700 transition-colors"
                >
                  {b.name}
                </Link>
                <div className="mt-2 flex gap-4 text-sm text-slate-500">
                  <span>
                    {b.definitions?.length ?? 0}{" "}
                    {b.definitions?.length === 1 ? "definition" : "definitions"}
                  </span>
                  <span>
                    {b.months?.length ?? 0}{" "}
                    {b.months?.length === 1 ? "month" : "months"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/budgets/${b.id}`}
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Edit
                </Link>
                {deleting === b.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Delete?</span>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setDeleting(null)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleting(b.id)}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
