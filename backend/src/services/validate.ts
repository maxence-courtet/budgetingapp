import { Response } from "express";

/** An error the client caused; the error handler (and sendError) turn it into a 400 with this message. */
export class BadRequest extends Error {
  status = 400;
}

const isBlank = (v: unknown) => v === undefined || v === null || v === "";

/** A finite number, or null when blank and `optional`. */
export function num(
  v: unknown,
  field: string,
  opts: { optional?: boolean; min?: number; positive?: boolean } = {}
): number | null {
  if (isBlank(v)) {
    if (opts.optional) return null;
    throw new BadRequest(`${field} is required`);
  }
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  if (!Number.isFinite(n)) throw new BadRequest(`${field} must be a number`);
  if (opts.positive && n <= 0) throw new BadRequest(`${field} must be greater than 0`);
  if (opts.min !== undefined && n < opts.min) throw new BadRequest(`${field} must be at least ${opts.min}`);
  return n;
}

/** A valid date (ISO string or YYYY-MM-DD), or null when blank and `optional`. */
export function date(v: unknown, field: string, opts: { optional?: boolean } = {}): Date | null {
  if (isBlank(v)) {
    if (opts.optional) return null;
    throw new BadRequest(`${field} is required`);
  }
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw new BadRequest(`${field} must be a valid date`);
  return d;
}

export function oneOf<T extends string>(v: unknown, field: string, allowed: readonly T[], opts: { optional?: boolean } = {}): T | null {
  if (isBlank(v)) {
    if (opts.optional) return null;
    throw new BadRequest(`${field} is required`);
  }
  if (!allowed.includes(v as T)) throw new BadRequest(`${field} must be one of: ${allowed.join(", ")}`);
  return v as T;
}

/** A trimmed, non-empty string. */
export function text(v: unknown, field: string, opts: { optional?: boolean; max?: number } = {}): string | null {
  const s = typeof v === "string" ? v.trim() : isBlank(v) ? "" : String(v).trim();
  if (!s) {
    if (opts.optional) return null;
    throw new BadRequest(`${field} is required`);
  }
  if (opts.max && s.length > opts.max) throw new BadRequest(`${field} must be at most ${opts.max} characters`);
  return s;
}

/** Today's date as a UTC-midnight Date, in the server's local calendar. */
export function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** End of today, for "dated on or before today" filters. */
export function endOfTodayUtc(): Date {
  return new Date(todayUtc().getTime() + 86_400_000 - 1);
}

/** For routes with their own try/catch: send client errors as 400, everything else as 500. */
export function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof BadRequest) return res.status(400).json({ error: error.message });
  const status = (error as { status?: number })?.status;
  if (status && status < 500) return res.status(status).json({ error: (error as Error).message });
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

export const TRANSACTION_TYPES = ["INCOME", "SPENDING", "TRANSFER"] as const;
export const TRANSACTION_STATUSES = ["PLANNED", "PAID", "PENDING", "SKIPPED"] as const;
export const GOAL_TYPES = ["FINANCIAL", "HABIT", "FITNESS", "PERSONAL"] as const;
export const GOAL_STATUSES = ["ACTIVE", "COMPLETED", "ABANDONED"] as const;
export const ACCOUNT_TYPES = ["checking", "savings", "credit card", "cash", "investment"] as const;

/** Account types are stored lowercase ("credit card"); older data used upper case with underscores. */
export function normalizeAccountType(v: unknown): string {
  const t = text(v, "type")!.toLowerCase().replace(/_/g, " ");
  if (!(ACCOUNT_TYPES as readonly string[]).includes(t)) {
    throw new BadRequest(`type must be one of: ${ACCOUNT_TYPES.join(", ")}`);
  }
  return t;
}

/**
 * Checks a transaction (or budget definition) after merging an update, and clears the
 * account that doesn't apply to its type, so switching SPENDING → INCOME can't leave a stale debit.
 */
export function normalizeMoneyFlow(t: {
  type: unknown;
  amount: unknown;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  toCategoryId?: string | null;
}) {
  const type = oneOf(t.type, "type", TRANSACTION_TYPES)!;
  const amount = num(t.amount, "amount", { positive: true })!;
  const fromAccountId = type === "INCOME" ? null : t.fromAccountId || null;
  const toAccountId = type === "SPENDING" ? null : t.toAccountId || null;
  if (type !== "INCOME" && !fromAccountId) throw new BadRequest(`A ${type.toLowerCase()} needs a "from" account`);
  if (type !== "SPENDING" && !toAccountId) throw new BadRequest(`${type === "INCOME" ? "Income" : "A transfer"} needs a "to" account`);
  if (type === "TRANSFER" && fromAccountId === toAccountId) throw new BadRequest("A transfer needs two different accounts");
  const toCategoryId = type === "TRANSFER" ? t.toCategoryId || t.categoryId || null : null;
  return { type, amount, fromAccountId, toAccountId, toCategoryId };
}
