import prisma from "./prisma";
import { todayUtc } from "./validate";

// Statistical links between what the user does and what they spend, found by
// comparing days with and without an activity. These are correlations only.

export interface Pattern {
  id: string;
  kind: "habit-spending" | "workout-spending" | "habit-habit" | "weekday-spending";
  title: string;
  detail: string;
  /** Relative size of the effect, used for ranking (0.4 = 40%). */
  strength: number;
}

const DAY_MS = 86_400_000;
const MIN_DAYS_EACH_SIDE = 5;
const MIN_SPEND_EFFECT = 0.25; // 25% difference in average daily spending
const MIN_SPEND_DIFF = 3; // and at least 3 currency units a day
const MIN_HABIT_EFFECT = 0.25; // 25 percentage points
const FREQUENT_CATEGORY_TXNS = 5; // skip one-off categories like rent

const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: n < 100 ? 2 : 0 });
const pct = (n: number) => `${Math.round(Math.abs(n) * 100)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export async function findPatterns(userId: string, windowDays = 90): Promise<{ windowDays: number; patterns: Pattern[] }> {
  const today = todayUtc(); // local calendar day, as UTC midnight
  const from = new Date(today.getTime() - (windowDays - 1) * DAY_MS);

  const [txns, habits, logs, fitness] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, status: "PAID", type: "SPENDING", date: { gte: from } },
      select: { amount: true, date: true, category: { select: { name: true } } },
    }),
    prisma.habit.findMany({ where: { userId, active: true, frequency: "DAILY" } }),
    prisma.habitLog.findMany({
      where: { userId, completed: true, validatedAt: { not: null }, date: { gte: from } },
      select: { habitId: true, date: true },
    }),
    prisma.fitnessEntry.findMany({
      where: { userId, type: "WORKOUT_DURATION", validatedAt: { not: null }, date: { gte: from } },
      select: { date: true },
    }),
  ]);

  const days: string[] = [];
  for (let t = from.getTime(); t <= today.getTime(); t += DAY_MS) days.push(iso(new Date(t)));

  // Daily spending, total over frequent categories and per frequent category.
  const counts = new Map<string, number>();
  txns.forEach((t) => counts.set(t.category.name, (counts.get(t.category.name) ?? 0) + 1));
  const frequent = [...counts.entries()].filter(([, n]) => n >= FREQUENT_CATEGORY_TXNS).map(([c]) => c);
  const spendBy = new Map<string, Map<string, number>>(); // category ("*" = all frequent) -> day -> amount
  for (const c of ["*", ...frequent]) spendBy.set(c, new Map());
  for (const t of txns) {
    if (!frequent.includes(t.category.name)) continue;
    const d = iso(t.date);
    for (const c of ["*", t.category.name]) {
      const m = spendBy.get(c)!;
      m.set(d, (m.get(d) ?? 0) + t.amount);
    }
  }

  const doneBy = new Map<string, Set<string>>();
  logs.forEach((l) => {
    if (!doneBy.has(l.habitId)) doneBy.set(l.habitId, new Set());
    doneBy.get(l.habitId)!.add(iso(l.date));
  });

  const patterns: Pattern[] = [];

  /** Compare spending on days in `withDays` vs the other eligible days. */
  function spendingSplit(id: string, kind: Pattern["kind"], label: string, withDays: Set<string>, eligible: string[]) {
    const yes = eligible.filter((d) => withDays.has(d));
    const no = eligible.filter((d) => !withDays.has(d));
    if (yes.length < MIN_DAYS_EACH_SIDE || no.length < MIN_DAYS_EACH_SIDE) return;
    for (const c of ["*", ...frequent]) {
      const m = spendBy.get(c)!;
      const a = avg(yes.map((d) => m.get(d) ?? 0));
      const b = avg(no.map((d) => m.get(d) ?? 0));
      if (b === 0) continue; // no baseline to compare against
      const effect = (a - b) / b;
      if (Math.abs(a - b) < MIN_SPEND_DIFF || Math.abs(effect) < MIN_SPEND_EFFECT) continue;
      const what = c === "*" ? "day-to-day spending" : c;
      patterns.push({
        id: `${id}:${c}`,
        kind,
        title: `On days you ${label}, you spend ${pct(effect)} ${a < b ? "less" : "more"} on ${what}`,
        detail: `${money(a)} vs ${money(b)} a day · ${yes.length} days with, ${no.length} without`,
        strength: Math.min(Math.abs(effect), 3),
      });
    }
  }

  for (const h of habits) {
    const eligible = days.filter((d) => d >= iso(h.createdAt));
    spendingSplit(`habit:${h.id}`, "habit-spending", `do “${h.name}”`, doneBy.get(h.id) ?? new Set(), eligible);
  }

  const workoutDays = new Set(fitness.map((f) => iso(f.date)));
  if (workoutDays.size) spendingSplit("workout", "workout-spending", "work out", workoutDays, days);

  // Habit pairs: is B more likely on days A is done?
  for (const a of habits) {
    for (const b of habits) {
      if (a.id === b.id) continue;
      const eligible = days.filter((d) => d >= iso(a.createdAt) && d >= iso(b.createdAt));
      const aDone = doneBy.get(a.id) ?? new Set<string>();
      const bDone = doneBy.get(b.id) ?? new Set<string>();
      const yes = eligible.filter((d) => aDone.has(d));
      const no = eligible.filter((d) => !aDone.has(d));
      if (yes.length < MIN_DAYS_EACH_SIDE || no.length < MIN_DAYS_EACH_SIDE) continue;
      const pYes = yes.filter((d) => bDone.has(d)).length / yes.length;
      const pNo = no.filter((d) => bDone.has(d)).length / no.length;
      if (Math.abs(pYes - pNo) < MIN_HABIT_EFFECT) continue;
      patterns.push({
        id: `pair:${a.id}:${b.id}`,
        kind: "habit-habit",
        title: `When you do “${a.name}”, you ${pYes > pNo ? "also" : "rarely"} do “${b.name}”`,
        detail: `${Math.round(pYes * 100)}% of days with it vs ${Math.round(pNo * 100)}% without`,
        strength: Math.abs(pYes - pNo),
      });
    }
  }

  // Weekday with unusually high spending (needs at least 4 of each weekday).
  if (frequent.length && days.length >= 28) {
    const m = spendBy.get("*")!;
    const byWeekday = Array.from({ length: 7 }, (_, w) => avg(days.filter((d) => new Date(d).getUTCDay() === w).map((d) => m.get(d) ?? 0)));
    const top = byWeekday.indexOf(Math.max(...byWeekday));
    const rest = avg(byWeekday.filter((_, w) => w !== top));
    if (rest > 0 && byWeekday[top] / rest >= 1.5 && byWeekday[top] - rest >= MIN_SPEND_DIFF) {
      const name = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][top];
      patterns.push({
        id: `weekday:${top}`,
        kind: "weekday-spending",
        title: `${name} are your biggest spending days`,
        detail: `${money(byWeekday[top])} on average vs ${money(rest)} on other days`,
        strength: byWeekday[top] / rest - 1,
      });
    }
  }

  // Keep pairs one-directional (the stronger direction) and rank.
  const seen = new Set<string>();
  const ranked = patterns
    .sort((x, y) => y.strength - x.strength)
    .filter((p) => {
      if (p.kind !== "habit-habit") return true;
      const [, a, b] = p.id.split(":");
      const key = [a, b].sort().join(":");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { windowDays, patterns: ranked.slice(0, 8) };
}
