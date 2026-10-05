// Goal progress for both directions: "reach 10,000 saved" (higher is better) and
// "get down to 76 kg" (lower is better: a startValue above the target).

export interface GoalLike {
  targetValue: number | null;
  currentValue: number | null;
  startValue?: number | null;
}

export function isDecreasing(g: GoalLike): boolean {
  return g.targetValue != null && g.startValue != null && g.startValue > g.targetValue;
}

/** Where `value` sits between the start (0) and the target (1), clamped to [0, 1]. */
export function fraction(g: GoalLike, value: number): number {
  const target = g.targetValue ?? 0;
  const raw = isDecreasing(g)
    ? (g.startValue! - value) / (g.startValue! - target)
    : target ? value / target : 0;
  return Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0));
}

export function goalProgress(g: GoalLike) {
  const current = g.currentValue ?? 0;
  const target = g.targetValue ?? 0;
  return {
    pct: Math.round(fraction(g, current) * 100),
    reached: isDecreasing(g) ? current <= target : current >= target,
    decreasing: isDecreasing(g),
  };
}

/** Has the goal's current value passed this milestone's target (in the goal's direction)? */
export function milestoneReached(g: GoalLike, milestoneTarget: number | null): boolean {
  if (milestoneTarget == null || g.targetValue == null) return false;
  const current = g.currentValue ?? 0;
  return isDecreasing(g) ? current <= milestoneTarget : current >= milestoneTarget;
}

/** 1234.5 → "1,234.5"; floating noise like 49.99999999999999 → "50". */
export function fmtNum(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}
