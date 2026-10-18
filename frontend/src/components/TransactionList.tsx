"use client";

import { fmt } from "@/lib/format";
import { STATUS_COLORS, TransactionStatus } from "@/lib/constants";

interface Props {
  transactions: any[];
  /** Names for transfer target categories, which the API returns as ids only. */
  categories?: { id: string; name: string }[];
  /** Tapping a row (e.g. open it for editing). */
  onSelect?: (tx: any) => void;
  /** Tapping the status pill moves it to the next status. */
  onStatusCycle?: (tx: any) => void;
  /** Show the year with the date, for lists spanning months. */
  showYear?: boolean;
}

/** Transactions as a list that works at any width: date, what and where, amount and status. */
export function TransactionList({ transactions, categories = [], onSelect, onStatusCycle, showYear }: Props) {
  return (
    <ul role="list" className="divide-y divide-line">
      {transactions.map((tx) => {
        const date = new Date(tx.date);
        const toCategory =
          tx.toCategoryId && tx.toCategoryId !== tx.categoryId
            ? categories.find((c) => c.id === tx.toCategoryId)?.name ?? tx.toCategory?.name
            : null;
        const category = [tx.category?.name, toCategory].filter(Boolean).join(" → ");
        const account =
          tx.type === "TRANSFER"
            ? `${tx.fromAccount?.name ?? "?"} → ${tx.toAccount?.name ?? "?"}`
            : tx.type === "SPENDING"
            ? tx.fromAccount?.name
            : tx.toAccount?.name;
        const title = tx.description || category || "Transaction";
        const sign = tx.type === "INCOME" ? "+" : tx.type === "SPENDING" ? "−" : "";
        const color = tx.type === "INCOME" ? "text-pos" : tx.type === "SPENDING" ? "text-fg" : "text-muted";

        const body = (
          <>
            <span className="w-11 shrink-0 text-center leading-none">
              <span className="block font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                {date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
              </span>
              <span className="block mt-1 text-[17px] font-semibold text-fg">
                {date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" })}
              </span>
              {showYear && (
                <span className="block mt-0.5 font-mono text-[10px] text-faint">{date.getUTCFullYear()}</span>
              )}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-medium text-fg truncate">{title}</span>
              <span className="block text-xs text-muted truncate">
                {[tx.description ? category : null, account].filter(Boolean).join(" · ") || " "}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className={`block text-[15px] font-semibold font-mono ${color}`}>
                {sign}
                {fmt(tx.amount)}
              </span>
            </span>
          </>
        );

        return (
          <li key={tx.id} className={`flex items-center ${tx.status === "SKIPPED" ? "opacity-55" : ""}`}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(tx)}
                className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-1 py-3 text-left hover:bg-surface-2 transition-colors"
              >
                {body}
              </button>
            ) : (
              <div className="flex-1 min-w-0 flex items-center gap-3 pl-3 pr-1 py-3">{body}</div>
            )}
            {tx.status &&
              (onStatusCycle ? (
                <button
                  type="button"
                  onClick={() => onStatusCycle(tx)}
                  aria-label={`Status: ${tx.status.toLowerCase()}. Change`}
                  className="self-stretch pr-3 pl-1 shrink-0 flex items-center"
                >
                  <StatusDot status={tx.status} />
                </button>
              ) : (
                <span className="pr-3 pl-1 shrink-0 flex items-center">
                  <StatusDot status={tx.status} />
                </span>
              ))}
          </li>
        );
      })}
    </ul>
  );
}

/** Compact status: a pill with the full word from sm up, a short tag on phones. */
function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block py-1 rounded-md font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-center w-[2.6rem] sm:w-[4.75rem] ${
        STATUS_COLORS[status as TransactionStatus] ?? ""
      }`}
      title={status.toLowerCase()}
    >
      <span className="sm:hidden" aria-hidden="true">{status.slice(0, 4)}</span>
      <span className="hidden sm:inline">{status}</span>
      <span className="sr-only sm:hidden">{status}</span>
    </span>
  );
}
