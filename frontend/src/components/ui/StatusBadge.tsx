import { STATUS_COLORS, TransactionStatus } from "@/lib/constants";

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  const color = STATUS_COLORS[status as TransactionStatus] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}
