"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  logHabit,
  getAllHabitLogs,
  getPendingHabitLogs,
  validateHabitLog,
  deleteHabitLog,
} from "@/lib/api";
import {
  HabitLite,
  LogLite,
  addDays,
  badges as computeBadges,
  doneDatesByHabit,
  habitStats,
  levelInfo,
  perfectDays,
  todayISO,
  totalXP,
  PERFECT_DAY_XP,
  XP_PER_CHECKIN,
  MAX_STREAK_BONUS,
} from "@/lib/habitStats";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { Check, Flame, MoreHorizontal, Trophy, Lock, ChevronRight, Sparkles } from "lucide-react";

interface Habit extends HabitLite {
  description?: string | null;
}

const HISTORY_DAYS = 400;
const GRID_DAYS = 14;
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function streakTone(n: number) {
  if (n >= 30) return "text-orange-500";
  if (n >= 7) return "text-accent";
  if (n >= 1) return "text-fg";
  return "text-faint";
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<LogLite[]>([]);
  const [pendingLogs, setPendingLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFrequency, setFormFrequency] = useState("DAILY");
  const [saving, setSaving] = useState(false);

  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(false);
  const [celebration, setCelebration] = useState<string | null>(null);

  const today = todayISO();
  const gridDays = useMemo(
    () => Array.from({ length: GRID_DAYS }, (_, i) => addDays(today, i - (GRID_DAYS - 1))),
    [today]
  );

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [habitsData, pendingData, logData] = await Promise.all([
        getHabits(),
        getPendingHabitLogs(),
        getAllHabitLogs({ dateFrom: addDays(todayISO(), -HISTORY_DAYS), dateTo: todayISO() }),
      ]);
      setHabits(habitsData ?? []);
      setPendingLogs(pendingData ?? []);
      setLogs((logData ?? []).map((l: any) => ({ ...l, date: l.date.slice(0, 10) })));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived stats ──────────────────────────────────────────────────────
  const active = habits.filter((h) => h.active);
  const paused = habits.filter((h) => !h.active);
  const done = useMemo(() => doneDatesByHabit(logs), [logs]);
  const pendingByHabit = useMemo(() => {
    const m = new Map<string, Set<string>>();
    logs.filter((l) => !l.validatedAt).forEach((l) => {
      if (!m.has(l.habitId)) m.set(l.habitId, new Set());
      m.get(l.habitId)!.add(l.date);
    });
    return m;
  }, [logs]);
  const stats = useMemo(
    () => new Map(habits.map((h) => [h.id, habitStats(h, done.get(h.id) ?? new Set(), today)])),
    [habits, done, today]
  );
  const perfect = useMemo(() => perfectDays(habits, done), [habits, done]);
  const xp = useMemo(() => totalXP(habits, done, perfect), [habits, done, perfect]);
  const level = levelInfo(xp);
  const badgeList = computeBadges([...stats.values()], perfect, done);
  const dailyActive = active.filter((h) => h.frequency !== "WEEKLY");
  const doneTodayCount = active.filter((h) => stats.get(h.id)?.doneForPeriod).length;
  const bestCurrent = active
    .map((h) => ({ h, s: stats.get(h.id)! }))
    .sort((a, b) => b.s.current - a.s.current)[0];

  // Celebrate level-ups and perfect days triggered by this session's check-ins.
  const prevLevel = useRef<number | null>(null);
  const maxLevelSeen = useRef(0);
  const prevPerfectToday = useRef<boolean | null>(null);
  useEffect(() => {
    if (loading) return;
    const perfectToday = perfect.has(today);
    if (prevLevel.current !== null && level.level > prevLevel.current && level.level > maxLevelSeen.current) {
      setCelebration(`Level ${level.level} — ${level.title}!`);
    } else if (prevPerfectToday.current === false && perfectToday) {
      setCelebration(`Perfect day! +${PERFECT_DAY_XP} XP`);
    }
    prevLevel.current = level.level;
    maxLevelSeen.current = Math.max(maxLevelSeen.current, level.level);
    prevPerfectToday.current = perfectToday;
  }, [loading, level.level, level.title, perfect, today]);
  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 4000);
    return () => clearTimeout(t);
  }, [celebration]);

  useEffect(() => {
    if (!menuId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuId(null);
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-habit-menu]")) setMenuId(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [menuId]);

  const gridScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [loading]);

  // ── Actions ────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormFrequency("DAILY");
    setShowCreate(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError("A habit needs a name.");
      return;
    }
    setSaving(true);
    try {
      await createHabit({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        frequency: formFrequency,
      });
      resetForm();
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDay = async (habit: Habit, day: string) => {
    const wasDone = done.get(habit.id)?.has(day) ?? false;
    const optimistic: LogLite = { habitId: habit.id, date: day, completed: !wasDone, validatedAt: new Date().toISOString() };
    setLogs((ls) => [...ls.filter((l) => !(l.habitId === habit.id && l.date === day)), optimistic]);
    try {
      await logHabit(habit.id, { date: day, completed: !wasDone });
    } catch (e: any) {
      setError(e.message);
      await loadData();
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      setError("A habit needs a name.");
      return;
    }
    try {
      await updateHabit(id, { name: editName.trim() });
      setEditingId(null);
      setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, name: editName.trim() } : h)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggleActive = async (habit: Habit) => {
    setMenuId(null);
    try {
      await updateHabit(habit.id, { active: !habit.active });
      setHabits((hs) =>
        hs.map((h) =>
          h.id === habit.id ? { ...h, active: !h.active, pausedAt: h.active ? new Date().toISOString() : null } : h
        )
      );
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteHabit(id);
      setDeleteConfirm(null);
      setHabits((hs) => hs.filter((h) => h.id !== id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleApproveLog = async (logId: string) => {
    try {
      await validateHabitLog(logId);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRejectLog = async (logId: string) => {
    try {
      await deleteHabitLog(logId);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <LoadingState message="Loading habits..." />;

  const gridCols = `2.25rem minmax(7rem, 1fr) 3.75rem repeat(${GRID_DAYS}, 1.375rem) 2.5rem 1.75rem`;

  const renderRow = (habit: Habit, index: number, rows: Habit[]) => {
    const menuUp = rows.length > 3 && index >= rows.length - 2;
    const s = stats.get(habit.id)!;
    const habitDone = done.get(habit.id) ?? new Set<string>();
    const pending = pendingByHabit.get(habit.id);
    const unit = s.unit === "week" ? "w" : "d";

    return (
      <li
        key={habit.id}
        role="row"
        className="grid items-center gap-x-0.5 px-3 h-11 border-b border-line last:border-0 hover:bg-surface-2/50"
        style={{ gridTemplateColumns: gridCols }}
      >
        <span role="cell">
          <button
            type="button"
            onClick={() => handleToggleDay(habit, today)}
            disabled={!habit.active}
            aria-pressed={s.doneToday}
            aria-label={
              s.doneToday
                ? `Undo ${habit.name} for today`
                : s.doneForPeriod
                ? `${habit.name} is done this week; check in again today`
                : `Check in ${habit.name} for today`
            }
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
              s.doneToday
                ? "bg-accent text-accent-ink"
                : s.doneForPeriod
                ? "bg-accent-soft text-accent-strong"
                : "border-[1.5px] border-line-strong text-transparent hover:border-accent hover:text-accent"
            }`}
          >
            <Check size={14} strokeWidth={3} aria-hidden="true" />
          </button>
        </span>

        <span role="cell" className="min-w-0 flex items-center gap-2 pr-2">
          {editingId === habit.id ? (
            <form
              className="flex items-center gap-1 w-full"
              onSubmit={(e) => {
                e.preventDefault();
                handleRename(habit.id);
              }}
            >
              <label htmlFor={`rename-${habit.id}`} className="sr-only">Habit name</label>
              <input
                id={`rename-${habit.id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                autoFocus
                className="flex-1 min-w-0 h-7 border border-line-strong rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button type="submit" className="h-7 px-2 text-xs font-medium bg-accent text-accent-ink rounded-lg">Save</button>
            </form>
          ) : (
            <>
              <span className="truncate text-sm font-medium text-fg" title={habit.description ? `${habit.name} — ${habit.description}` : habit.name}>
                {habit.name}
              </span>
              {habit.frequency === "WEEKLY" && (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.04em] px-1 rounded bg-surface-2 text-muted">
                  weekly
                </span>
              )}
            </>
          )}
        </span>

        <span
          role="cell"
          className={`flex items-center gap-1 font-mono text-sm ${streakTone(s.current)}`}
          title={`Current streak ${s.current}${unit} · best ${s.best}${unit}`}
        >
          <Flame size={14} aria-hidden="true" className={s.current >= 7 ? "fill-current" : ""} />
          {s.current}
          <span className="text-[11px] text-faint">{unit}</span>
          <span className="sr-only">streak, best {s.best}</span>
        </span>

        {deleteConfirm === habit.id ? (
          <span role="cell" style={{ gridColumn: `span ${GRID_DAYS + 2}` }}>
            <ConfirmDelete
              label={`Delete “${habit.name}” and its history?`}
              onConfirm={() => handleDelete(habit.id)}
              onCancel={() => setDeleteConfirm(null)}
            />
          </span>
        ) : (
          <>
            {gridDays.map((day) => {
              const isDone = habitDone.has(day);
              const isPending = pending?.has(day);
              const isToday = day === today;
              return (
                <span role="cell" key={day} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(habit, day)}
                    disabled={!habit.active}
                    aria-pressed={isDone}
                    aria-label={`${habit.name}, ${formatLogDate(day)}: ${isDone ? "done" : isPending ? "pending review" : "not done"}`}
                    className={`w-5 h-5 rounded-[5px] transition-colors disabled:cursor-default ${
                      isDone
                        ? "bg-accent"
                        : isPending
                        ? "border border-dashed border-accent"
                        : "bg-surface-2 hover:bg-line-strong"
                    } ${isToday ? "ring-1 ring-offset-1 ring-offset-surface ring-accent/60" : ""}`}
                  />
                </span>
              );
            })}

            <span role="cell" className="font-mono text-xs text-muted text-right" title="Completion over the last 30 days">
              {Math.round(s.rate30 * 100)}%
            </span>

            {!habit.active ? (
              <span role="cell" className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleToggleActive(habit)}
                  className="h-7 px-2 rounded-lg text-xs font-medium text-accent hover:bg-accent-soft"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(habit.id)}
                  aria-label={`Delete ${habit.name}`}
                  className="h-7 px-2 rounded-lg text-xs font-medium text-neg hover:bg-surface-2"
                >
                  Delete
                </button>
              </span>
            ) : (
            <span role="cell" className="relative flex justify-end" data-habit-menu>
              <button
                type="button"
                onClick={() => setMenuId(menuId === habit.id ? null : habit.id)}
                aria-label={`Options for ${habit.name}`}
                aria-expanded={menuId === habit.id}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:text-fg hover:bg-surface-2"
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </button>
              {menuId === habit.id && (
                <div
                  role="menu"
                  className={`absolute right-0 ${menuUp ? "bottom-8" : "top-8"} z-20 w-40 p-1 rounded-xl border border-line-strong bg-surface shadow-xl shadow-black/20`}
                >
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setEditingId(habit.id);
                      setEditName(habit.name);
                      setMenuId(null);
                    }}
                    className="w-full text-left px-3 h-8 rounded-lg text-sm text-fg hover:bg-surface-2"
                  >
                    Rename
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => handleToggleActive(habit)}
                    className="w-full text-left px-3 h-8 rounded-lg text-sm text-fg hover:bg-surface-2"
                  >
                    {habit.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setDeleteConfirm(habit.id);
                      setMenuId(null);
                    }}
                    className="w-full text-left px-3 h-8 rounded-lg text-sm text-neg hover:bg-surface-2"
                  >
                    Delete
                  </button>
                </div>
              )}
            </span>
            )}
          </>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habits"
        action={
          !showCreate ? (
            <button
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
              className="h-10 px-4 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              + New habit
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {celebration && (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-accent text-accent-ink px-5 py-3 font-semibold">
          <Sparkles size={18} aria-hidden="true" />
          {celebration}
        </div>
      )}

      {/* Progress strip */}
      <section aria-label="Progress" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">Level {level.level}</p>
            <p className="font-mono text-xs text-muted">{xp.toLocaleString("en-US")} XP</p>
          </div>
          <p className="text-xl font-semibold tracking-tight text-fg">{level.title}</p>
          <div
            className="h-1.5 rounded-full bg-surface-2 overflow-hidden"
            role="progressbar"
            aria-label="Progress to next level"
            aria-valuemin={0}
            aria-valuemax={level.levelSize}
            aria-valuenow={level.intoLevel}
          >
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(level.intoLevel / level.levelSize) * 100}%` }} />
          </div>
          <p className="text-xs text-muted">{level.toNext} XP to level {level.level + 1}</p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-4">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="shrink-0 -rotate-90">
            <circle cx="28" cy="28" r="23" fill="none" strokeWidth="6" className="stroke-surface-2" />
            <circle
              cx="28"
              cy="28"
              r="23"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              className="stroke-accent transition-all"
              strokeDasharray={`${active.length ? (doneTodayCount / active.length) * 144.5 : 0} 144.5`}
              opacity={doneTodayCount ? 1 : 0}
            />
          </svg>
          <div>
            <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">Today</p>
            <p className="font-mono text-2xl text-fg">
              {doneTodayCount}<span className="text-faint">/{active.length}</span>
            </p>
            <p className="text-xs text-muted">
              {perfect.has(today)
                ? "Perfect day — bonus earned"
                : dailyActive.length
                ? `Finish all daily habits for +${PERFECT_DAY_XP} XP`
                : "Add a daily habit to start"}
            </p>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 space-y-1">
          <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">Longest active streak</p>
          <p className={`flex items-center gap-1.5 font-mono text-2xl ${streakTone(bestCurrent?.s.current ?? 0)}`}>
            <Flame size={20} aria-hidden="true" className={(bestCurrent?.s.current ?? 0) >= 7 ? "fill-current" : ""} />
            {bestCurrent?.s.current ?? 0}
            <span className="text-sm text-faint">{bestCurrent?.s.unit === "week" ? "weeks" : "days"}</span>
          </p>
          <p className="text-xs text-muted truncate">{bestCurrent && bestCurrent.s.current > 0 ? bestCurrent.h.name : "Check in today to start one"}</p>
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">Badges</p>
            <p className="font-mono text-xs text-muted">
              {badgeList.filter((b) => b.earned).length}/{badgeList.length}
            </p>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Badges">
            {badgeList.map((b) => (
              <li
                key={b.id}
                title={`${b.label} — ${b.description}${b.earned ? "" : " (locked)"}`}
                className={`flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium ${
                  b.earned ? "bg-accent-soft text-accent-strong" : "bg-surface-2 text-faint"
                }`}
              >
                {b.earned ? <Trophy size={11} aria-hidden="true" /> : <Lock size={11} aria-hidden="true" />}
                {b.label}
                <span className="sr-only">{b.earned ? "earned" : "locked"}: {b.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pending MCP banner */}
      {pendingLogs.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-yellow-800 mb-3">
            {pendingLogs.length} habit {pendingLogs.length === 1 ? "entry" : "entries"} added by AI — approve to count {pendingLogs.length === 1 ? "it" : "them"} toward streaks
          </p>
          <ul className="space-y-1.5">
            {pendingLogs.map((log: any) => (
              <li key={log.id} className="flex items-center justify-between gap-4 bg-surface rounded-xl px-3 py-2">
                <span className="flex-1 min-w-0 text-sm truncate">
                  <span className="font-medium text-fg">{log.habit?.name ?? log.habitId}</span>
                  <span className="mx-2 text-faint">·</span>
                  <span className="text-muted">{formatLogDate(log.date)}</span>
                  <span className="mx-2 text-faint">·</span>
                  <span className={log.completed ? "text-pos" : "text-muted"}>{log.completed ? "Completed" : "Not completed"}</span>
                  {log.note && <span className="ml-2 text-xs text-muted italic">“{log.note}”</span>}
                </span>
                <span className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApproveLog(log.id)}
                    className="h-7 px-3 text-xs font-medium bg-accent text-accent-ink rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectLog(log.id)}
                    className="h-7 px-3 text-xs font-medium border border-line-strong text-fg-2 rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    Reject
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-surface border border-line rounded-2xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex-[2_1_14rem]">
            <label htmlFor="habit-name" className="block text-xs font-medium text-muted mb-1">Name</label>
            <input
              id="habit-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Morning run"
              autoFocus
              required
              className="w-full h-10 border border-line-strong rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex-[1_1_8rem]">
            <label htmlFor="habit-frequency" className="block text-xs font-medium text-muted mb-1">Frequency</label>
            <select
              id="habit-frequency"
              value={formFrequency}
              onChange={(e) => setFormFrequency(e.target.value)}
              className="w-full h-10 border border-line-strong rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>
          <div className="flex-[3_1_14rem]">
            <label htmlFor="habit-description" className="block text-xs font-medium text-muted mb-1">Description (optional)</label>
            <input
              id="habit-description"
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full h-10 border border-line-strong rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 text-sm font-semibold bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Adding…" : "Add habit"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="h-10 px-4 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Habit grid */}
      {habits.length === 0 ? (
        <EmptyState
          message="No habits yet."
          cta={{ label: "Create your first habit", onClick: () => { resetForm(); setShowCreate(true); } }}
        />
      ) : (
        <section aria-labelledby="habits-grid-heading" className="bg-surface border border-line rounded-2xl">
          <h2 id="habits-grid-heading" className="sr-only">Your habits</h2>
          <div ref={gridScrollRef} className="relative overflow-x-auto">
            <div role="table" aria-label="Habits, last 14 days" className="min-w-[39rem]">
              <div
                role="row"
                className="grid items-end gap-x-0.5 px-3 pt-3 pb-2 border-b border-line"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span role="columnheader"><span className="sr-only">Today</span></span>
                <span role="columnheader" className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
                  {active.length} active
                </span>
                <span role="columnheader" className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">Streak</span>
                {gridDays.map((day) => {
                  const d = new Date(day + "T00:00:00Z");
                  const isToday = day === today;
                  return (
                    <span
                      role="columnheader"
                      key={day}
                      className={`flex flex-col items-center font-mono text-[10px] leading-tight ${isToday ? "text-accent font-semibold" : "text-faint"}`}
                      aria-label={formatLogDate(day)}
                    >
                      <span>{WEEKDAY[d.getUTCDay()]}</span>
                      <span>{d.getUTCDate()}</span>
                    </span>
                  );
                })}
                <span role="columnheader" className="font-mono text-[11px] text-muted text-right">30d</span>
                <span role="columnheader"><span className="sr-only">Options</span></span>
              </div>
              <ul role="rowgroup">{active.map(renderRow)}</ul>
              {active.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted text-center">All habits are paused.</p>
              )}
            </div>
          </div>

          {paused.length > 0 && (
            <div className="border-t border-line">
              <button
                type="button"
                onClick={() => setShowPaused((v) => !v)}
                aria-expanded={showPaused}
                className="w-full flex items-center gap-2 px-4 h-10 text-sm text-muted hover:text-fg"
              >
                <ChevronRight size={14} className={`transition-transform ${showPaused ? "rotate-90" : ""}`} aria-hidden="true" />
                Paused ({paused.length})
              </button>
              {showPaused && (
                <div className="relative overflow-x-auto opacity-70">
                  <div role="table" aria-label="Paused habits" className="min-w-[39rem]">
                    <ul role="rowgroup">{paused.map(renderRow)}</ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-muted">
        {XP_PER_CHECKIN} XP per check-in, up to +{MAX_STREAK_BONUS} for keeping a streak going, +{PERFECT_DAY_XP} for a perfect day.
        Click any square to fill in a day you missed.
      </p>
    </div>
  );
}
