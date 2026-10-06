// Streaks, XP, levels and badges for habits, computed from the raw logs.
// Dates are ISO day strings (YYYY-MM-DD), matching how logs are written.

import { localISO } from "./date";

export interface HabitLite {
  id: string;
  name: string;
  frequency: string; // "DAILY" | "WEEKLY"
  active: boolean;
  createdAt?: string;
  pausedAt?: string | null;
}

export interface LogLite {
  habitId: string;
  date: string;
  completed: boolean;
  validatedAt: string | null;
}

export interface HabitStats {
  current: number;
  best: number;
  unit: "day" | "week";
  rate30: number; // 0–1
  total: number;
  doneToday: boolean;
  /** Daily: done today. Weekly: done at least once this week (Monday–today). */
  doneForPeriod: boolean;
}

export const XP_PER_CHECKIN = 10;
export const MAX_STREAK_BONUS = 10;
export const PERFECT_DAY_XP = 25;

const DAY_MS = 86_400_000;

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(iso + "T00:00:00Z") + n * DAY_MS).toISOString().slice(0, 10);
}

export function todayISO(): string {
  return localISO();
}

/** When tracking really started: the creation day, or an earlier back-filled log. */
export function effectiveStart(habit: HabitLite, done: Set<string>): string {
  const created = habit.createdAt?.slice(0, 10);
  const first = [...done].sort()[0];
  if (!created) return first ?? todayISO();
  return first && first < created ? first : created;
}

function weekKey(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return addDays(iso, -((d.getUTCDay() + 6) % 7)); // Monday of that week
}

/** Completed, validated log dates per habit. Pending AI entries don't count until approved. */
export function doneDatesByHabit(logs: LogLite[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!l.completed || !l.validatedAt) continue;
    const day = l.date.slice(0, 10);
    if (!map.has(l.habitId)) map.set(l.habitId, new Set());
    map.get(l.habitId)!.add(day);
  }
  return map;
}

/** Longest and current run of consecutive keys, stepping `step(key, -1)` back from `latest`. */
function runs(keys: Set<string>, latest: string, step: (k: string, n: number) => string) {
  const start = keys.has(latest) ? latest : step(latest, -1);
  let current = 0;
  for (let k = start; keys.has(k); k = step(k, -1)) current++;

  let best = 0;
  for (const k of keys) {
    if (keys.has(step(k, -1))) continue; // only count from the start of each run
    let len = 0;
    for (let j = k; keys.has(j); j = step(j, 1)) len++;
    best = Math.max(best, len);
  }
  return { current, best };
}

const stepWeek = (k: string, n: number) => addDays(k, 7 * n);

export function habitStats(habit: HabitLite, done: Set<string>, today = todayISO()): HabitStats {
  const weekly = habit.frequency === "WEEKLY";
  const start = effectiveStart(habit, done);

  if (weekly) {
    const weeks = new Set([...done].map(weekKey));
    const { current, best } = runs(weeks, weekKey(today), stepWeek);
    const weeksTracked = Math.min(4, Math.max(1, Math.round((Date.parse(weekKey(today)) - Date.parse(weekKey(start))) / (7 * DAY_MS)) + 1));
    let inWindow = 0;
    for (let i = 0; i < weeksTracked; i++) if (weeks.has(weekKey(addDays(today, -7 * i)))) inWindow++;
    const thisWeek = weeks.has(weekKey(today));
    return { current, best, unit: "week", rate30: inWindow / weeksTracked, total: done.size, doneToday: done.has(today), doneForPeriod: thisWeek };
  }

  const { current, best } = runs(done, today, addDays);
  const daysTracked = Math.min(30, Math.max(1, Math.round((Date.parse(today) - Date.parse(start)) / DAY_MS) + 1));
  let inWindow = 0;
  for (let i = 0; i < daysTracked; i++) if (done.has(addDays(today, -i))) inWindow++;
  return { current, best, unit: "day", rate30: inWindow / daysTracked, total: done.size, doneToday: done.has(today), doneForPeriod: done.has(today) };
}

/**
 * Days on which every daily habit that was being tracked then was done.
 * A habit counts from its effective start; a paused habit only up to its last completion,
 * so pausing (or resuming) a habit never rewrites past perfect days, XP or badges.
 */
export function perfectDays(habits: HabitLite[], done: Map<string, Set<string>>): Set<string> {
  const daily = habits
    .filter((h) => h.frequency !== "WEEKLY")
    .map((h) => {
      const days = done.get(h.id) ?? new Set<string>();
      const sorted = [...days].sort();
      // A paused habit counts up to the day before it was paused (older data without pausedAt: its last completion).
      const end = h.active
        ? "9999-12-31"
        : h.pausedAt
        ? addDays(h.pausedAt.slice(0, 10), -1)
        : sorted[sorted.length - 1] ?? "";
      return { h, days, start: effectiveStart(h, days), end };
    });
  const candidates = new Set<string>();
  daily.forEach((d) => d.days.forEach((x) => candidates.add(x)));
  const perfect = new Set<string>();
  for (const day of candidates) {
    const due = daily.filter((d) => d.start <= day && day <= d.end);
    if (due.length > 0 && due.every((d) => d.days.has(day))) perfect.add(day);
  }
  return perfect;
}

/** 10 XP per check-in, +1 per day (or week) of the running streak up to +10, +25 per perfect day. */
export function totalXP(habits: HabitLite[], done: Map<string, Set<string>>, perfect: Set<string>): number {
  let xp = perfect.size * PERFECT_DAY_XP;
  for (const h of habits) {
    const dates = [...(done.get(h.id) ?? [])].sort();
    const weekly = h.frequency === "WEEKLY";
    let run = 0;
    let prevKey: string | null = null;
    for (const d of dates) {
      const key = weekly ? weekKey(d) : d;
      if (key === prevKey) {
        xp += XP_PER_CHECKIN; // extra check-in in the same week: no streak bonus
        continue;
      }
      run = prevKey !== null && (weekly ? stepWeek(prevKey, 1) : addDays(prevKey, 1)) === key ? run + 1 : 1;
      xp += XP_PER_CHECKIN + Math.min(run - 1, MAX_STREAK_BONUS);
      prevKey = key;
    }
  }
  return xp;
}

const LEVEL_TITLES = ["Starter", "Builder", "Regular", "Committed", "Disciplined", "Relentless", "Unstoppable", "Legend"];

/** Level n starts at 100 · n(n−1)/2 XP: 0, 100, 300, 600, 1000, … */
export function levelInfo(xp: number) {
  let level = 1;
  while (100 * ((level + 1) * level) / 2 <= xp) level++;
  const floor = (100 * level * (level - 1)) / 2;
  const next = (100 * (level + 1) * level) / 2;
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    intoLevel: xp - floor,
    levelSize: next - floor,
    toNext: next - xp,
  };
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export function badges(
  stats: HabitStats[],
  perfect: Set<string>,
  done: Map<string, Set<string>>
): Badge[] {
  const bestDaily = Math.max(0, ...stats.filter((s) => s.unit === "day").map((s) => s.best));
  const total = stats.reduce((n, s) => n + s.total, 0);
  const perDay = new Map<string, number>();
  done.forEach((days) => days.forEach((d) => perDay.set(d, (perDay.get(d) ?? 0) + 1)));
  const maxInADay = Math.max(0, ...perDay.values());
  const { best: bestPerfectRun } = runs(perfect, todayISO(), addDays);

  return [
    { id: "first", label: "First step", description: "Complete a habit once", earned: total > 0 },
    { id: "week", label: "One week", description: "7-day streak on any habit", earned: bestDaily >= 7 },
    { id: "month", label: "One month", description: "30-day streak on any habit", earned: bestDaily >= 30 },
    { id: "hundred-streak", label: "Centurion", description: "100-day streak on any habit", earned: bestDaily >= 100 },
    { id: "perfect", label: "Perfect day", description: "Every daily habit done in one day", earned: perfect.size > 0 },
    { id: "perfect-week", label: "Perfect week", description: "7 perfect days in a row", earned: bestPerfectRun >= 7 },
    { id: "ten", label: "Juggler", description: "10 habits done in one day", earned: maxInADay >= 10 },
    { id: "hundred", label: "100 check-ins", description: "100 completions in total", earned: total >= 100 },
  ];
}
