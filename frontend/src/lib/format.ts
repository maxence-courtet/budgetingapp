export function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatAmount(n: number, type?: string): string {
  const prefix = type === "INCOME" ? "+" : type === "SPENDING" ? "-" : n < 0 ? "-" : "";
  return prefix + fmt(n);
}

export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
