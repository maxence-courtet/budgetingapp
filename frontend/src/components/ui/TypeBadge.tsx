import { TYPE_COLORS, TransactionType } from "@/lib/constants";

interface Props {
  type: string;
}

export function TypeBadge({ type }: Props) {
  const color = TYPE_COLORS[type as TransactionType] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {type}
    </span>
  );
}
