"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  getHabitLogs,
  getPendingHabitLogs,
  validateHabitLog,
  deleteHabitLog,
} from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function getLast7Days(): { iso: string; label: string }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      iso: d.toISOString().slice(0, 10),
      label: DAY_LABELS[d.getDay()],
    });
  }
  return days;
}

function formatLogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<any[]>([]);
  const [pendingLogs, setPendingLogs] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFrequency, setFormFrequency] = useState("DAILY");
  const [saving, setSaving] = useState(false);

  // Per-habit UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [habitsData, pendingData] = await Promise.all([
        getHabits(),
        getPendingHabitLogs(),
      ]);
      setHabits(habitsData ?? []);
      setPendingLogs(pendingData ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHabitLogs = useCallback(async (habitsList: any[]) => {
    if (!habitsList.length) return;
    const dateFrom = daysAgoISO(6);
    const dateTo = todayISO();
    try {
      const entries = await Promise.all(
        habitsList.map((h) =>
          getHabitLogs(h.id, { dateFrom, dateTo }).then((logs) => ({
            id: h.id,
            logs: logs ?? [],
          }))
        )
      );
      const map = new Map<string, any[]>();
      entries.forEach(({ id, logs }) => map.set(id, logs));
      setHabitLogs(map);
    } catch {
      // Non-critical — don't surface log-load errors
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (habits.length > 0) {
      loadHabitLogs(habits);
    }
  }, [habits, loadHabitLogs]);

  const refreshAll = async () => {
    await loadData();
  };

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormFrequency("DAILY");
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await createHabit({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        frequency: formFrequency,
      });
      resetForm();
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await updateHabit(id, { name: editName.trim() });
      setEditingId(null);
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (habit: any) => {
    try {
      await updateHabit(habit.id, { active: !habit.active });
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHabit(id);
      setDeleteConfirm(null);
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleLogToday = async (habitId: string) => {
    setLoggingId(habitId);
    try {
      await logHabit(habitId, { date: todayISO(), completed: true });
      await loadHabitLogs(habits);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoggingId(null);
    }
  };

  const handleApproveLog = async (logId: string) => {
    try {
      await validateHabitLog(logId);
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRejectLog = async (logId: string) => {
    try {
      await deleteHabitLog(logId);
      await refreshAll();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const last7Days = getLast7Days();

  if (loading) return <LoadingState message="Loading habits..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        action={
          !showCreate ? (
            <button
              onClick={() => { resetForm(); setShowCreate(true); }}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              + New Habit
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Pending MCP banner */}
      {pendingLogs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-yellow-800 mb-3">
            {pendingLogs.length} habit {pendingLogs.length === 1 ? "entry" : "entries"} added by AI — review and approve
          </p>
          <div className="space-y-2">
            {pendingLogs.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between gap-4 bg-white border border-yellow-100 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">
                    {log.habit?.name ?? log.habitId}
                  </span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className="text-xs text-slate-500">{formatLogDate(log.date)}</span>
                  <span className="mx-2 text-slate-400">·</span>
                  <span className={`text-xs font-medium ${log.completed ? "text-green-600" : "text-slate-500"}`}>
                    {log.completed ? "Completed" : "Not completed"}
                  </span>
                  {log.note && (
                    <span className="ml-2 text-xs text-slate-500 italic truncate">"{log.note}"</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApproveLog(log.id)}
                    className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectLog(log.id)}
                    className="px-3 py-1 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">New Habit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="habit-name" className="block text-sm font-medium text-slate-600 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="habit-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Morning run"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="habit-frequency" className="block text-sm font-medium text-slate-600 mb-1">
                Frequency
              </label>
              <select
                id="habit-frequency"
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="habit-description" className="block text-sm font-medium text-slate-600 mb-1">
                Description
              </label>
              <textarea
                id="habit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                placeholder="Optional description"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating..." : "Create Habit"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Habits list */}
      {habits.length === 0 ? (
        <EmptyState
          message="No habits yet."
          cta={{ label: "Create your first habit", onClick: () => { resetForm(); setShowCreate(true); } }}
        />
      ) : (
        <div className="space-y-4">
          {habits.map((habit: any) => {
            const logs = habitLogs.get(habit.id) ?? [];
            const logsByDate = new Map<string, any>(
              logs.map((l: any) => [l.date?.slice(0, 10), l])
            );
            const isLogging = loggingId === habit.id;
            const todayLogged = logsByDate.has(todayISO()) && logsByDate.get(todayISO())?.completed;

            return (
              <div
                key={habit.id}
                className={`bg-white border border-slate-200 shadow-sm rounded-lg p-5 ${!habit.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {editingId === habit.id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(habit.id)}
                          disabled={saving || !editName.trim()}
                          className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-slate-900">{habit.name}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            habit.frequency === "WEEKLY"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {habit.frequency ?? "DAILY"}
                        </span>
                        {!habit.active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                    )}
                    {habit.description && (
                      <p className="text-sm text-slate-500 mb-3">{habit.description}</p>
                    )}

                    {/* 7-day strip */}
                    <div className="flex gap-1.5 mt-3">
                      {last7Days.map(({ iso, label }) => {
                        const log = logsByDate.get(iso);
                        const completed = log?.completed === true;
                        return (
                          <div key={iso} className="flex flex-col items-center gap-1">
                            <div
                              title={iso}
                              className={`w-7 h-7 rounded-md border ${
                                completed
                                  ? "bg-green-500 border-green-600"
                                  : "bg-slate-100 border-slate-200"
                              }`}
                            />
                            <span className="text-[10px] text-slate-400">{label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => handleLogToday(habit.id)}
                        disabled={isLogging || todayLogged}
                        className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {isLogging ? "Logging..." : todayLogged ? "Logged today" : "Log today"}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {deleteConfirm === habit.id ? (
                      <ConfirmDelete
                        onConfirm={() => handleDelete(habit.id)}
                        onCancel={() => setDeleteConfirm(null)}
                        label="Delete habit?"
                      />
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(habit.id);
                              setEditName(habit.name);
                            }}
                            className="px-3 py-1 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(habit)}
                            className="px-3 py-1 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            {habit.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(habit.id)}
                            className="px-3 py-1 text-xs font-medium border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
