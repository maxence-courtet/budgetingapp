"use client";

import { useId, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { fmt, fmtWhole } from "@/lib/format";

export interface RingItem {
  id: string;
  name: string;
  value: number;
  /** Money moved to another account rather than spent: drawn hatched and tagged in the legend. */
  kind?: "spending" | "transfer";
  /** A second line in the legend, e.g. the destination account. */
  detail?: string;
}

const SLOTS = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)", "var(--viz-5)"];
const OTHER = "var(--viz-other)";

// Ring geometry in SVG units: the gap is the surface showing between segments.
const R = 64;
const STROKE = 15;
const C = 2 * Math.PI * R;
const GAP = 2.5;

/**
 * Where the money goes, as a ring: the five biggest categories plus "Other", the total in the middle.
 * Hovering or focusing a segment or legend row shows that category in the centre.
 */
export function SpendingRing({
  items,
  totalLabel = "Spent",
  emptyText = "Nothing spent yet.",
}: {
  items: RingItem[];
  totalLabel?: string;
  emptyText?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const uid = useId().replace(/:/g, "");

  const positive = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = positive.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return <p className="text-sm text-muted">{emptyText}</p>;

  const moved = positive.filter((i) => i.kind === "transfer").reduce((s, i) => s + i.value, 0);

  // More than six slices stop reading as a ring: the tail folds into "Other".
  const head = positive.length > 6 ? positive.slice(0, 5) : positive.slice(0, 6);
  const tail = positive.slice(head.length);
  const slices: (RingItem & { color: string; count: number })[] = [
    ...head.map((i, n) => ({ ...i, color: n < SLOTS.length ? SLOTS[n] : OTHER, count: 1 })),
    ...(tail.length
      ? [{ id: "__other", name: `Other`, value: tail.reduce((s, i) => s + i.value, 0), color: OTHER, count: tail.length }]
      : []),
  ];
  const isTransfer = (s: { kind?: string }) => s.kind === "transfer";

  let offset = 0;
  const arcs = slices.map((s) => {
    const len = (s.value / total) * C;
    const arc = { ...s, start: offset, len: Math.max(len - (slices.length > 1 ? GAP : 0), 0.5) };
    offset += len;
    return arc;
  });

  const current = slices.find((s) => s.id === active);
  const pct = (v: number) => {
    const p = (v / total) * 100;
    return p < 1 ? "<1%" : `${Math.round(p)}%`;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
      <div className="relative mx-auto sm:mx-0 w-44 h-44 shrink-0">
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full -rotate-90"
          role="img"
          aria-label={`${totalLabel} ${fmt(total)}: ${slices.map((s) => `${s.name}${isTransfer(s) ? " (moved)" : ""} ${pct(s.value)}`).join(", ")}`}
        >
          <defs>
            {slices.filter(isTransfer).map((s) => (
              <pattern
                key={s.id}
                id={`${uid}-${slices.indexOf(s)}`}
                width="5"
                height="5"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="5" height="5" fill={s.color} />
                <rect width="1.6" height="5" fill="var(--surface)" opacity="0.75" />
              </pattern>
            ))}
          </defs>
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.id}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={isTransfer(a) ? `url(#${uid}-${slices.findIndex((x) => x.id === a.id)})` : a.color}
              strokeWidth={active === a.id ? STROKE + 4 : STROKE}
              strokeDasharray={`${a.len} ${C - a.len}`}
              strokeDashoffset={-a.start}
              onPointerEnter={() => setActive(a.id)}
              onPointerLeave={() => setActive(null)}
              onClick={() => setActive((x) => (x === a.id ? null : a.id))}
              className="cursor-pointer transition-[opacity,stroke-width] duration-150"
              style={{ opacity: active && active !== a.id ? 0.3 : 1 }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-8" aria-live="polite">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted truncate max-w-full">
            {current ? current.name : totalLabel}
          </span>
          <span className="mt-0.5 text-[22px] leading-tight font-semibold font-mono text-fg">
            {fmtWhole(current ? current.value : total)}
          </span>
          <span className="text-xs text-muted">
            {current
              ? `${pct(current.value)}${isTransfer(current) ? " · moved" : ""}`
              : moved > 0
              ? `${fmtWhole(total - moved)} spent · ${fmtWhole(moved)} moved`
              : `${positive.length} categor${positive.length === 1 ? "y" : "ies"}`}
          </span>
        </div>
      </div>

      <ul role="list" className="flex-1 min-w-0 sm:max-w-md space-y-0.5">
        {slices.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onPointerEnter={() => setActive(s.id)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(s.id)}
              onBlur={() => setActive(null)}
              {...(s.id === "__other" && {
                onClick: () => setOtherOpen((o) => !o),
                "aria-expanded": otherOpen,
                "aria-controls": `${uid}-other`,
              })}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                active === s.id ? "bg-surface-2" : ""
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  background: isTransfer(s)
                    ? `repeating-linear-gradient(45deg, ${s.color} 0 2px, var(--surface) 2px 3px)`
                    : s.color,
                }}
                aria-hidden="true"
              />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-sm text-fg">
                  <span className="truncate">{s.name}</span>
                  {s.count > 1 && (
                    <span className="text-muted shrink-0">
                      · {s.count} {otherOpen ? "▾" : "▸"}
                    </span>
                  )}
                  {isTransfer(s) && (
                    <ArrowLeftRight size={12} className="text-muted shrink-0" aria-label="transfer" />
                  )}
                </span>
                {s.detail && <span className="block text-xs text-muted truncate">{s.detail}</span>}
              </span>
              <span className="font-mono text-xs text-muted w-9 text-right">{pct(s.value)}</span>
              <span className="font-mono text-sm text-fg w-20 text-right">{fmtWhole(s.value)}</span>
            </button>
            {s.id === "__other" && otherOpen && (
              <ul id={`${uid}-other`} role="list" className="ml-[1.4rem] pl-3 border-l border-line mb-1">
                {tail.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-2.5 py-1.5">
                    <span className="flex-1 min-w-0 flex items-center gap-1.5 text-[13px] text-fg-2" title={t.detail}>
                      <span className="truncate">{t.name}</span>
                      {t.kind === "transfer" && (
                        <ArrowLeftRight size={11} className="text-muted shrink-0" aria-label="transfer" />
                      )}
                    </span>
                    <span className="font-mono text-xs text-muted w-9 text-right">{pct(t.value)}</span>
                    <span className="font-mono text-[13px] text-fg-2 w-20 text-right">{fmtWhole(t.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
