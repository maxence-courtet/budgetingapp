"use client";

import { useState } from "react";
import { fmt, fmtWhole } from "@/lib/format";

export interface RingItem {
  id: string;
  name: string;
  value: number;
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

  const positive = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = positive.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return <p className="text-sm text-muted">{emptyText}</p>;

  // More than six slices stop reading as a ring: the tail folds into "Other".
  const head = positive.length > 6 ? positive.slice(0, 5) : positive.slice(0, 6);
  const tail = positive.slice(head.length);
  const slices = [
    ...head.map((i, n) => ({ ...i, color: n < SLOTS.length ? SLOTS[n] : OTHER, count: 1 })),
    ...(tail.length
      ? [{ id: "__other", name: `Other`, value: tail.reduce((s, i) => s + i.value, 0), color: OTHER, count: tail.length }]
      : []),
  ];

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
          aria-label={`${totalLabel} ${fmt(total)}: ${slices.map((s) => `${s.name} ${pct(s.value)}`).join(", ")}`}
        >
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.id}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={a.color}
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
            {current ? pct(current.value) : `${positive.length} categor${positive.length === 1 ? "y" : "ies"}`}
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
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-colors ${
                active === s.id ? "bg-surface-2" : ""
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate text-sm text-fg">
                {s.name}
                {s.count > 1 && <span className="text-muted"> · {s.count}</span>}
              </span>
              <span className="font-mono text-xs text-muted w-9 text-right">{pct(s.value)}</span>
              <span className="font-mono text-sm text-fg w-20 text-right">{fmtWhole(s.value)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
