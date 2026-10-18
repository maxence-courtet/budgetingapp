import { STATUS_COLORS, TransactionStatus } from "@/lib/constants";

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const color = STATUS_COLORS[status as TransactionStatus] ?? "bg-surface-2 text-fg-2";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium uppercase tracking-[0.04em] ${color}`}>
      {status}
    </span>
  );
}
