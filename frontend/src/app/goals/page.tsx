"use client";

import { localISO } from "@/lib/date";
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
import { goalProgress, fraction, milestoneReached, isDecreasing, fmtNum } from "@/lib/goals";
import { plural } from "@/lib/date";
import { Plus, Pencil, Trash2 } from "lucide-react";

type StatusFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ABANDONED";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "COMPLETED", label: "Done" },
  { id: "ABANDONED", label: "Dropped" },
];

const INPUT = "w-full h-10 border border-line-strong rounded-xl px-3 text-sm text-fg bg-surface focus:outline-none focus:ring-2 focus:ring-accent";
const LABEL = "block text-xs font-medium text-muted mb-1";

const TYPE_BADGE_STYLES: Record<string, string> = {
  FINANCIAL: "bg-accent-soft text-accent-strong",
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
  return localISO();
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
  const [formLowerBetter, setFormLowerBetter] = useState(false);
  const [formStart, setFormStart] = useState("");
  const [saving, setSaving] = useState(false);

  // Per-goal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editTarget, setEditTarget] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
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
    setFormLowerBetter(false);
    setFormStart("");
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    if (formLowerBetter && (!formTarget || !formStart || parseFloat(formStart) <= parseFloat(formTarget))) {
      setError("For a goal where lower is better, the starting value must be above the target.");
      return;
    }
    setSaving(true);
    try {
      await createGoal({
        title: formTitle.trim(),
        type: formType,
        description: formDescription.trim() || undefined,
        targetValue: formTarget ? parseFloat(formTarget) : undefined,
        unit: formUnit.trim() || undefined,
        deadline: formDeadline || undefined,
        startValue: formLowerBetter && formStart ? parseFloat(formStart) : undefined,
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
      await updateGoal(id, {
        title: editTitle.trim(),
        status: editStatus,
        targetValue: editTarget === "" ? null : parseFloat(editTarget),
        startValue: editStart === "" ? null : parseFloat(editStart),
        unit: editUnit.trim() || null,
        deadline: editDeadline || null,
      });
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
      const next = isDecreasing(goal) ? delta : (goal.currentValue ?? 0) + delta;
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

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const startEdit = (goal: any) => {
    setEditingId(goal.id);
    setDeleteConfirm(null);
    setEditTitle(goal.title);
    setEditStatus(goal.status ?? "ACTIVE");
    setEditTarget(goal.targetValue != null ? String(goal.targetValue) : "");
    setEditStart(goal.startValue != null ? String(goal.startValue) : "");
    setEditUnit(goal.unit ?? "");
    setEditDeadline(goal.deadline ? goal.deadline.slice(0, 10) : "");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Goals"
        action={
          !showCreate ? (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              New goal
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Status filter */}
      <div role="group" aria-label="Filter by status" className="grid grid-cols-4 sm:inline-grid p-1 rounded-xl bg-surface-2">
        {STATUS_FILTERS.map((f) => {
          const count = f.id === "ALL" ? goals.length : goals.filter((g) => g.status === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              aria-pressed={statusFilter === f.id}
              className={`h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f.id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {f.label}
              {count > 0 && <span className="ml-1 font-mono text-xs text-faint">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface border border-line rounded-2xl p-4 sm:p-6">
          <h2 className="text-base font-semibold text-fg mb-4">New goal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="goal-title" className={LABEL}>
                Title <span className="text-neg">*</span>
              </label>
              <input
                id="goal-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Run a 5K"
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="goal-type" className={LABEL}>Type</label>
              <select id="goal-type" value={formType} onChange={(e) => setFormType(e.target.value)} className={INPUT}>
                <option value="PERSONAL">Personal</option>
                <option value="FINANCIAL">Financial</option>
                <option value="HABIT">Habit</option>
                <option value="FITNESS">Fitness</option>
              </select>
            </div>
            <div>
              <label htmlFor="goal-deadline" className={LABEL}>Deadline</label>
              <input
                id="goal-deadline"
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="goal-target" className={LABEL}>Target value</label>
              <input
                id="goal-target"
                type="number"
                inputMode="decimal"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="Optional"
                step="any"
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="goal-unit" className={LABEL}>Unit</label>
              <input
                id="goal-unit"
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder='e.g. "$", "kg", "days"'
                className={INPUT}
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
              <label className="flex items-center gap-2 text-sm text-fg-2 min-h-10">
                <input
                  type="checkbox"
                  checked={formLowerBetter}
                  onChange={(e) => setFormLowerBetter(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
                Lower is better (e.g. weight, debt)
              </label>
              {formLowerBetter && (
                <div className="flex-1 sm:min-w-[10rem]">
                  <label htmlFor="goal-start" className={LABEL}>Starting value</label>
                  <input
                    id="goal-start"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    placeholder="e.g. 79.4"
                    className={INPUT}
                  />
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="goal-description" className={LABEL}>Description</label>
              <textarea
                id="goal-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Optional"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm text-fg bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !formTitle.trim()}
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create goal"}
            </button>
            <button
              onClick={resetForm}
              className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
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
          cta={statusFilter === "ALL" ? { label: "Create your first goal", onClick: openCreate } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
          {filteredGoals.map((goal: any) => {
            const hasTarget = goal.targetValue != null && (goal.targetValue > 0 || isDecreasing(goal));
            const current = goal.currentValue ?? 0;
            const target = goal.targetValue ?? 0;
            const { pct, decreasing } = goalProgress(goal);
            const finished = goal.status !== "ACTIVE";
            const unitSuffix = goal.unit ? ` ${goal.unit}` : "";

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
              <article key={goal.id} aria-label={goal.title} className="bg-surface border border-line rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
                {editingId === goal.id ? (
                  <form
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdate(goal.id);
                    }}
                  >
                    <h3 className="sm:col-span-2 text-sm font-semibold text-fg">Edit goal</h3>
                    <label className="sm:col-span-2 text-xs font-medium text-muted">
                      Title
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className={`mt-1 ${INPUT}`} autoFocus />
                    </label>
                    <label className="sm:col-span-2 text-xs font-medium text-muted">
                      Status
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className={`mt-1 ${INPUT}`}>
                        {!["ACTIVE", "COMPLETED", "ABANDONED"].includes(editStatus) && <option value={editStatus}>{editStatus}</option>}
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ABANDONED">Abandoned</option>
                      </select>
                    </label>
                    <label className="text-xs font-medium text-muted">
                      Target
                      <input type="number" inputMode="decimal" step="any" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className={`mt-1 ${INPUT}`} />
                    </label>
                    <label className="text-xs font-medium text-muted">
                      Unit
                      <input type="text" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} className={`mt-1 ${INPUT}`} />
                    </label>
                    <label className="text-xs font-medium text-muted">
                      Start (lower is better if above target)
                      <input type="number" inputMode="decimal" step="any" value={editStart} onChange={(e) => setEditStart(e.target.value)} className={`mt-1 ${INPUT}`} />
                    </label>
                    <label className="text-xs font-medium text-muted">
                      Deadline
                      <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className={`mt-1 ${INPUT}`} />
                    </label>
                    <div className="sm:col-span-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={saving || !editTitle.trim()}
                        className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-fg leading-snug">{goal.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] uppercase tracking-[0.04em] ${typeBadge}`}>
                            {goal.type}
                          </span>
                          {finished && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${statusBadge}`}>
                              {goal.status?.charAt(0) + goal.status?.slice(1).toLowerCase()}
                            </span>
                          )}
                          {goal.deadline && (
                            <span className={`text-xs font-medium ${finished ? "text-muted" : deadlineColor}`}>
                              {finished || deadlineDays === null
                                ? `Deadline ${formatDate(goal.deadline)}`
                                : deadlineDays < 0
                                ? `${plural(Math.abs(deadlineDays), "day")} overdue`
                                : deadlineDays === 0
                                ? "Due today"
                                : `${plural(deadlineDays, "day")} left`}
                              {!finished && <span className="text-muted font-normal">{" · "}{formatDate(goal.deadline)}</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 -mr-1.5 -mt-1">
                        <button
                          type="button"
                          onClick={() => startEdit(goal)}
                          aria-label={`Edit ${goal.title}`}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-faint hover:text-fg hover:bg-surface-2"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(deleteConfirm === goal.id ? null : goal.id)}
                          aria-label={`Delete ${goal.title}`}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-faint hover:text-neg hover:bg-surface-2"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {deleteConfirm === goal.id && (
                      <ConfirmDelete
                        onConfirm={() => handleDelete(goal.id)}
                        onCancel={() => setDeleteConfirm(null)}
                        label="Delete this goal?"
                      />
                    )}

                    {goal.description && (
                      <p className="text-sm text-muted leading-relaxed">{goal.description}</p>
                    )}

                    {/* Progress bar */}
                    {hasTarget && (
                      <div>
                        <div className="flex justify-between items-baseline gap-2 mb-1.5">
                          <span className="font-mono text-sm text-fg">
                            {decreasing
                              ? `${fmtNum(current)} → ${fmtNum(target)}${unitSuffix}`
                              : `${fmtNum(current)} / ${fmtNum(target)}${unitSuffix}`}
                            {decreasing && <span className="text-xs text-muted"> from {fmtNum(goal.startValue)}</span>}
                          </span>
                          <span className="font-mono text-sm font-medium text-fg-2">{pct}%</span>
                        </div>
                        <div className="relative">
                          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {(goal.milestones ?? [])
                            .filter((m: any) => m.targetValue != null && fraction(goal, m.targetValue) > 0 && fraction(goal, m.targetValue) < 1)
                            .map((m: any) => (
                              <span
                                key={m.id}
                                title={`${m.title} · ${fmtNum(m.targetValue)}${unitSuffix}`}
                                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-surface ${
                                  m.completedAt || milestoneReached(goal, m.targetValue) ? "bg-accent" : "bg-line-strong"
                                }`}
                                style={{ left: `${fraction(goal, m.targetValue) * 100}%` }}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Quick progress update */}
                    {hasTarget && goal.status === "ACTIVE" && (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleProgressUpdate(goal);
                        }}
                      >
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={progressInputs[goal.id] ?? ""}
                          onChange={(e) =>
                            setProgressInputs((prev) => ({ ...prev, [goal.id]: e.target.value }))
                          }
                          placeholder={decreasing ? "New value" : "Add or subtract"}
                          aria-label={decreasing ? `New value for ${goal.title}` : `Change progress of ${goal.title} by`}
                          className="flex-1 min-w-0 w-0 h-9 border border-line-strong rounded-xl px-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button
                          type="submit"
                          disabled={updatingProgress === goal.id || !progressInputs[goal.id]}
                          className="h-9 px-3 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                        >
                          {updatingProgress === goal.id ? "..." : decreasing ? "Set" : "Update"}
                        </button>
                      </form>
                    )}

                    {/* Milestones */}
                    <div className="pt-3 border-t border-line">
                      <GoalMilestones
                        goal={goal}
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
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
