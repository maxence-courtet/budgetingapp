export const TRANSACTION_TYPES = ["INCOME", "SPENDING", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["PLANNED", "PAID", "PENDING", "SKIPPED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: "bg-accent-soft text-accent",
  SPENDING: "bg-orange-100 text-orange-700",
  TRANSFER: "bg-surface-2 text-fg-2",
};

export const STATUS_COLORS: Record<TransactionStatus, string> = {
  PLANNED: "bg-surface-2 text-fg-2",
  PAID: "bg-accent-soft text-accent",
  PENDING: "bg-yellow-100 text-yellow-800",
  SKIPPED: "bg-surface-2 text-faint line-through",
};

export const STATUS_ORDER: TransactionStatus[] = ["PLANNED", "PAID", "PENDING", "SKIPPED"];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ACCOUNT_TYPES = ["checking", "savings", "credit card", "cash", "investment"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
