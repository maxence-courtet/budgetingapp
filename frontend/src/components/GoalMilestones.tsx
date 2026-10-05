"use client";

import { localISO } from "@/lib/date";
import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { createMilestone, toggleMilestone, deleteMilestone } from "@/lib/api";
import { GoalLike, milestoneReached, isDecreasing, fmtNum } from "@/lib/goals";

export interface Milestone {
  id: string;
  title: string;
  targetValue: number | null;
  dueDate: string | null;
  completedAt: string | null;
}

interface Props {
  goal: GoalLike;
  goalId: string;
  unit: string | null;
  currentValue: number;
  milestones: Milestone[];
  onChange: (milestones: Milestone[]) => void;
  onError: (message: string) => void;
}

/**
 * A stable order: milestones with a target first (in the goal's direction, ties by due date),
 * then date-only ones by due date, then the rest by creation order.
 */
export function sortMilestones(ms: Milestone[], decreasing = false): Milestone[] {
  const rank = (m: Milestone) => (m.targetValue != null ? 0 : m.dueDate ? 1 : 2);
  return ms
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const r = rank(a.m) - rank(b.m);
      if (r) return r;
      if (a.m.targetValue != null && b.m.targetValue != null && a.m.targetValue !== b.m.targetValue) {
        return decreasing ? b.m.targetValue - a.m.targetValue : a.m.targetValue - b.m.targetValue;
      }
      if (a.m.dueDate && b.m.dueDate && a.m.dueDate !== b.m.dueDate) return a.m.dueDate.localeCompare(b.m.dueDate);
      if (a.m.dueDate !== b.m.dueDate) return a.m.dueDate ? -1 : 1;
      return a.i - b.i;
    })
    .map(({ m }) => m);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function GoalMilestones({ goal, goalId, unit, milestones, onChange, onError }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = sortMilestones(milestones, isDecreasing(goal));
  const goalHasTarget = goal.targetValue != null;
  const doneCount = milestones.filter((m) => m.completedAt).length;
  const today = localISO();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const m = await createMilestone(goalId, {
        title: title.trim(),
        targetValue: target ? Number(target) : undefined,
        dueDate: due || undefined,
      });
      onChange([...milestones, m]);
      setTitle("");
      setTarget("");
      setDue("");
      setAdding(false);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(m: Milestone) {
    onChange(milestones.map((x) => (x.id === m.id ? { ...x, completedAt: x.completedAt ? null : new Date().toISOString() } : x)));
    try {
      await toggleMilestone(m.id);
    } catch (err: any) {
      onError(err.message);
      onChange(milestones);
    }
  }

  async function remove(m: Milestone) {
    onChange(milestones.filter((x) => x.id !== m.id));
    try {
      await deleteMilestone(m.id);
    } catch (err: any) {
      onError(err.message);
      onChange(milestones);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
          Milestones{milestones.length > 0 && ` · ${doneCount}/${milestones.length}`}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-accent hover:bg-accent-soft"
          >
            <Plus size={13} aria-hidden="true" />
            Add
          </button>
        )}
      </div>

      {sorted.length > 0 && (
        <ol className="relative ml-2.5 border-l border-line">
          {sorted.map((m) => {
            const reached = milestoneReached(goal, m.targetValue);
            const overdue = !m.completedAt && m.dueDate && m.dueDate.slice(0, 10) < today;
            return (
              <li key={m.id} className="group relative pl-5 py-1.5">
                <button
                  type="button"
                  onClick={() => toggle(m)}
                  aria-pressed={!!m.completedAt}
                  aria-label={`${m.completedAt ? "Mark not done" : "Mark done"}: ${m.title}`}
                  className={`absolute -left-[11px] top-1.5 w-[22px] h-[22px] rounded-full flex items-center justify-center transition-colors ${
                    m.completedAt
                      ? "bg-accent text-accent-ink"
                      : "bg-surface border-[1.5px] border-line-strong text-transparent hover:border-accent hover:text-accent"
                  }`}
                >
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </button>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${m.completedAt ? "text-muted line-through" : "text-fg"}`}>{m.title}</p>
                    <p className="font-mono text-[11px] text-muted">
                      {m.targetValue != null && `${fmtNum(m.targetValue)}${unit ? ` ${unit}` : ""}`}
                      {m.targetValue != null && m.dueDate && " · "}
                      {m.dueDate && <span className={overdue ? "text-neg" : ""}>{overdue ? "overdue · " : "by "}{shortDate(m.dueDate)}</span>}
                      {reached && !m.completedAt && <span className="text-accent"> · target reached, tick it off</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    aria-label={`Delete milestone ${m.title}`}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-faint opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-neg hover:bg-surface-2"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {sorted.length === 0 && !adding && (
        <p className="text-xs text-faint">Break this goal into steps you can tick off.</p>
      )}

      {adding && (
        <form onSubmit={add} className="space-y-2 rounded-xl bg-surface-2 p-3">
          <label htmlFor={`ms-title-${goalId}`} className="sr-only">Milestone</label>
          <input
            id={`ms-title-${goalId}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. First $2,500 saved"
            autoFocus
            required
            className="w-full h-9 border border-line-strong rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            {/* A target only makes sense when the goal itself has one to measure against. */}
            <div className="flex-1" hidden={!goalHasTarget}>
              <label htmlFor={`ms-target-${goalId}`} className="block text-[11px] text-muted mb-0.5">Target {unit ? `(${unit})` : ""}</label>
              <input
                id={`ms-target-${goalId}`}
                type="number"
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full h-9 border border-line-strong rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex-1">
              <label htmlFor={`ms-due-${goalId}`} className="block text-[11px] text-muted mb-0.5">Due</label>
              <input
                id={`ms-due-${goalId}`}
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full h-9 border border-line-strong rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="h-8 px-3 text-xs font-semibold bg-accent text-accent-ink rounded-lg hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add milestone"}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-8 px-3 text-xs font-medium border border-line-strong text-fg-2 rounded-lg hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
