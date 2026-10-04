import { TYPE_COLORS, TransactionType } from "@/lib/constants";

interface Props {
  type: string;
}

export function TypeBadge({ type }: Props) {
  const color = TYPE_COLORS[type as TransactionType] ?? "bg-surface-2 text-fg-2";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-md font-mono text-[11px] font-medium uppercase tracking-[0.04em] ${color}`}>
      {type}
    </span>
  );
}
