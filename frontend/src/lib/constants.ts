export const TRANSACTION_TYPES = ["INCOME", "SPENDING", "TRANSFER"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["PLANNED", "PAID", "PENDING", "SKIPPED"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TYPE_COLORS: Record<TransactionType, string> = {
  INCOME: "bg-green-100 text-green-700",
  SPENDING: "bg-red-100 text-red-700",
  TRANSFER: "bg-blue-100 text-blue-700",
};

export const STATUS_COLORS: Record<TransactionStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-800",
  SKIPPED: "bg-slate-200 text-slate-600",
};

export const STATUS_ORDER: TransactionStatus[] = ["PLANNED", "PAID", "PENDING", "SKIPPED"];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ACCOUNT_TYPES = ["checking", "savings", "credit card", "cash", "investment"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
