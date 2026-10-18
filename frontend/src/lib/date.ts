/** Today (or `d`) as YYYY-MM-DD in the user's own timezone. toISOString() is UTC, which is yesterday just after midnight in Europe. */
export function localISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "1 day" / "3 days". */
export function plural(n: number, word: string): string {
  return `${n} ${word}${Math.abs(n) === 1 ? "" : "s"}`;
}
