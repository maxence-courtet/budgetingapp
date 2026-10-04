"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getGoals,
  createGoal,
  updateGoal,
  updateGoalProgress,
  deleteGoal,
} from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { GoalMilestones } from "@/components/GoalMilestones";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ABANDONED";

const STATUS_FILTERS: StatusFilter[] = ["ALL", "ACTIVE", "COMPLETED", "ABANDONED"];

const TYPE_BADGE_STYLES: Record<string, string> = {
  FINANCIAL: "bg-accent-soft text-accent",
  HABIT: "bg-green-100 text-green-700",
  FITNESS: "bg-orange-100 text-orange-700",
  PERSONAL: "bg-purple-100 text-purple-700",
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ABANDONED: "bg-surface-2 text-muted",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateISO);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("PERSONAL");
  const [formDescription, setFormDescription] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // Per-goal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setError("");
    try {
      const data = await getGoals();
      setGoals(data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const resetForm = () => {
    setFormTitle("");
    setFormType("PERSONAL");
    setFormDescription("");
    setFormTarget("");
    setFormUnit("");
    setFormDeadline("");
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      await createGoal({
        title: formTitle.trim(),
        type: formType,
        description: formDescription.trim() || undefined,
        targetValue: formTarget ? parseFloat(formTarget) : undefined,
        unit: formUnit.trim() || undefined,
        deadline: formDeadline || undefined,
      });
      resetForm();
      await loadGoals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateGoal(id, { title: editTitle.trim(), status: editStatus });
      setEditingId(null);
      await loadGoals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleProgressUpdate = async (goal: any) => {
    const raw = progressInputs[goal.id] ?? "";
    const delta = parseFloat(raw);
    if (isNaN(delta)) return;
    setUpdatingProgress(goal.id);
    try {
      const next = (goal.currentValue ?? 0) + delta;
      await updateGoalProgress(goal.id, next);
      setProgressInputs((prev) => ({ ...prev, [goal.id]: "" }));
      await loadGoals();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      setDeleteConfirm(null);
      await loadGoals();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredGoals =
    statusFilter === "ALL"
      ? goals
      : goals.filter((g) => g.status === statusFilter);

  if (loading) return <LoadingState message="Loading goals..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        action={
          !showCreate ? (
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              + New Goal
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-accent text-accent-ink border-accent"
                : "bg-surface text-muted border-line-strong hover:border-accent hover:text-accent"
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">New Goal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="goal-title" className="block text-sm font-medium text-muted mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="goal-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Run a 5K"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="goal-type" className="block text-sm font-medium text-muted mb-1">
                Type
              </label>
              <select
                id="goal-type"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <option value="PERSONAL">Personal</option>
                <option value="FINANCIAL">Financial</option>
                <option value="HABIT">Habit</option>
                <option value="FITNESS">Fitness</option>
              </select>
            </div>
            <div>
              <label htmlFor="goal-deadline" className="block text-sm font-medium text-muted mb-1">
                Deadline
              </label>
              <input
                id="goal-deadline"
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="goal-target" className="block text-sm font-medium text-muted mb-1">
                Target Value
              </label>
              <input
                id="goal-target"
                type="number"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="Optional"
                step="any"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="goal-unit" className="block text-sm font-medium text-muted mb-1">
                Unit
              </label>
              <input
                id="goal-unit"
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder='e.g. "$", "kg", "days"'
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="goal-description" className="block text-sm font-medium text-muted mb-1">
                Description
              </label>
              <textarea
                id="goal-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Optional description"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !formTitle.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create Goal"}
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

      {/* Goals grid */}
      {filteredGoals.length === 0 ? (
        <EmptyState
          message={statusFilter === "ALL" ? "No goals yet." : `No ${statusFilter.toLowerCase()} goals.`}
          cta={statusFilter === "ALL" ? { label: "Create your first goal", onClick: () => { resetForm(); setShowCreate(true); } } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal: any) => {
            const hasTarget = goal.targetValue != null && goal.targetValue > 0;
            const current = goal.currentValue ?? 0;
            const target = goal.targetValue ?? 0;
            const pct = hasTarget ? Math.min(100, Math.round((current / target) * 100)) : 0;

            const deadlineDays = goal.deadline ? daysUntil(goal.deadline) : null;
            const deadlineColor =
              deadlineDays === null
                ? "text-muted"
                : deadlineDays < 7
                ? "text-neg"
                : deadlineDays < 30
                ? "text-yellow-600"
                : "text-muted";

            const typeBadge = TYPE_BADGE_STYLES[goal.type] ?? "bg-surface-2 text-muted";
            const statusBadge = STATUS_BADGE_STYLES[goal.status] ?? "bg-surface-2 text-muted";

            return (
              <div key={goal.id} className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === goal.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full border border-line-strong rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                          autoFocus
                        />
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full border border-line-strong rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="ABANDONED">Abandoned</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(goal.id)}
                            disabled={saving || !editTitle.trim()}
                            className="px-3 py-1 text-xs font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <h3 className="text-base font-semibold text-fg leading-snug">{goal.title}</h3>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeBadge}`}>
                      {goal.type}
                    </span>
                  </div>
                </div>

                {goal.description && (
                  <p className="text-sm text-muted leading-relaxed">{goal.description}</p>
                )}

                {/* Progress bar */}
                {hasTarget && (
                  <div>
                    <div className="flex justify-between items-center text-xs text-muted mb-1">
                      <span>Progress</span>
                      <span className="font-medium text-fg-2">
                        {current} / {target} {goal.unit ?? ""}
                      </span>
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {(goal.milestones ?? [])
                        .filter((m: any) => m.targetValue != null && m.targetValue > 0 && m.targetValue < target)
                        .map((m: any) => (
                          <span
                            key={m.id}
                            title={`${m.title} · ${m.targetValue} ${goal.unit ?? ""}`}
                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                              m.completedAt || current >= m.targetValue ? "bg-accent" : "bg-line-strong"
                            }`}
                            style={{ left: `${(m.targetValue / target) * 100}%` }}
                          />
                        ))}
                    </div>
                    <p className="text-xs text-faint mt-1 text-right">{pct}%</p>
                  </div>
                )}

                {/* Deadline */}
                {goal.deadline && (
                  <p className={`text-xs font-medium ${deadlineColor}`}>
                    {deadlineDays === null
                      ? formatDate(goal.deadline)
                      : deadlineDays < 0
                      ? `${Math.abs(deadlineDays)} days overdue`
                      : deadlineDays === 0
                      ? "Due today"
                      : `${deadlineDays} days remaining`}
                    {" · "}{formatDate(goal.deadline)}
                  </p>
                )}

                {/* Milestones */}
                <div className="pt-2 border-t border-line">
                  <GoalMilestones
                    goalId={goal.id}
                    unit={goal.unit ?? null}
                    currentValue={current}
                    milestones={goal.milestones ?? []}
                    onChange={(ms) =>
                      setGoals((gs) => gs.map((g) => (g.id === goal.id ? { ...g, milestones: ms } : g)))
                    }
                    onError={setError}
                  />
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge}`}>
                    {goal.status?.charAt(0) + goal.status?.slice(1).toLowerCase()}
                  </span>
                </div>

                {/* Quick progress update */}
                {hasTarget && goal.status === "ACTIVE" && (
                  <div className="flex items-center gap-2 pt-1 border-t border-line">
                    <input
                      type="number"
                      step="any"
                      value={progressInputs[goal.id] ?? ""}
                      onChange={(e) =>
                        setProgressInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))
                      }
                      placeholder="+/- value"
                      className="flex-1 border border-line-strong rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <button
                      onClick={() => handleProgressUpdate(goal)}
                      disabled={updatingProgress === goal.id || !progressInputs[goal.id]}
                      className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    >
                      {updatingProgress === goal.id ? "..." : "Update"}
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1 border-t border-line">
                  {deleteConfirm === goal.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(goal.id)}
                      onCancel={() => setDeleteConfirm(null)}
                      label="Delete goal?"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(goal.id);
                          setEditTitle(goal.title);
                          setEditStatus(goal.status ?? "ACTIVE");
                        }}
                        className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(goal.id)}
                        className="px-3 py-1 text-xs font-medium border border-red-300 text-neg rounded-xl hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
