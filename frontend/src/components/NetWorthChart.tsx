"use client";

import { useEffect, useState } from "react";
import { getNetWorthHistory } from "@/lib/api";
import { fmt } from "@/lib/format";
import { TRANSACTIONS_CHANGED } from "@/components/QuickAddTransaction";

interface Point {
  month: string;
  cash: number;
  investments: number;
  total: number;
  investmentsSource: "live" | "snapshot" | "cost";
}

const RANGES: { months: number | "all"; label: string }[] = [
  { months: 6, label: "6M" },
  { months: 12, label: "1Y" },
  { months: 24, label: "2Y" },
  { months: 60, label: "5Y" },
  { months: "all", label: "All" },
];
const HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 56 };

const signed = (n: number) => (n < 0 ? "−" : "") + fmt(n);
const monthLabel = (m: string, long = false) =>
  new Date(m + "-01T00:00:00Z").toLocaleDateString("en-US", {
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
    timeZone: "UTC",
  });

function compact(n: number) {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? `${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${(a / 1_000).toFixed(a >= 10_000 ? 0 : 1)}k` : a.toFixed(0);
  return (n < 0 ? "−$" : "$") + s;
}

/** Round gridline values covering [min, max], about three of them. */
function ticks(min: number, max: number) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / 2;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.max(Math.ceil(max / step) * step, lo + step);
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(v);
  return out;
}

export function NetWorthChart() {
  const [range, setRange] = useState<number | "all">(12);
  const [data, setData] = useState<Point[] | null>(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const [width, setWidth] = useState(640);
  // Callback ref: the observer attaches whenever the card's element appears (a ref + [] effect could miss it).
  const [box, setBox] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getNetWorthHistory(range)
        .then((d) => !cancelled && setData(d))
        .catch((e) => !cancelled && setError(e.message));
    load();
    window.addEventListener(TRANSACTIONS_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(TRANSACTIONS_CHANGED, load);
    };
  }, [range]);

  useEffect(() => {
    if (!box) return;
    setWidth(box.getBoundingClientRect().width - 40); // card padding (p-5) until the first observation
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);

  const header = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2 id="networth-heading" className="text-[15px] font-semibold text-fg">Net worth</h2>
      {data && data.length > 1 && <Change data={data} />}
      <div className="ml-auto flex items-center gap-2">
        <div role="group" aria-label="Time range" className="flex p-0.5 rounded-lg bg-surface-2">
          {RANGES.map((r) => (
            <button
              key={r.months}
              type="button"
              onClick={() => {
                setHover(null); // the hovered index may not exist in the new range
                setRange(r.months);
              }}
              aria-pressed={range === r.months}
              className={`h-7 px-2.5 rounded-md font-mono text-xs transition-colors ${
                range === r.months ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-label={asTable ? "Show as chart" : "Show as table"}
          className="h-8 px-2.5 rounded-lg text-xs font-medium text-muted hover:text-fg hover:bg-surface-2"
        >
          {asTable ? "Chart" : "Table"}
        </button>
      </div>
    </div>
  );

  if (error) {
    return (
      <section ref={setBox} aria-labelledby="networth-heading" className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        {header}
        <p className="text-sm text-neg">{error}</p>
      </section>
    );
  }

  const usesCost = data?.some((p) => p.investmentsSource === "cost" && p.investments > 0);

  return (
    <section ref={setBox} aria-labelledby="networth-heading" className="bg-surface border border-line rounded-2xl p-5 space-y-3">
      {header}
      {!data ? (
        <div className="h-[180px] rounded-xl bg-surface-2 animate-pulse" aria-hidden="true" />
      ) : asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Month-end net worth</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th scope="col" className="py-2 font-medium">Month</th>
                <th scope="col" className="py-2 font-medium text-right">Cash</th>
                <th scope="col" className="py-2 font-medium text-right">Investments</th>
                <th scope="col" className="py-2 font-medium text-right">Net worth</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {[...data].reverse().map((p) => (
                <tr key={p.month} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 font-sans font-medium text-fg text-left">{monthLabel(p.month, true)}</th>
                  <td className="py-2 text-right text-fg-2">{signed(p.cash)}</td>
                  <td className="py-2 text-right text-fg-2">
                    {signed(p.investments)}
                    {p.investmentsSource === "cost" && p.investments > 0 && <span className="text-faint">*</span>}
                  </td>
                  <td className="py-2 text-right text-fg">{signed(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Plot data={data} width={width} hover={hover} setHover={setHover} />
      )}
      {usesCost && (
        <p className="text-xs text-muted">
          {asTable ? "* " : ""}Investments before this app started recording them are shown at cost; from now on each month keeps its market value.
        </p>
      )}
    </section>
  );
}

function Change({ data }: { data: Point[] }) {
  const last = data[data.length - 1].total;
  const prev = data[data.length - 2].total;
  const delta = last - prev;
  return (
    <span className={`font-mono text-xs ${delta >= 0 ? "text-pos" : "text-neg"}`}>
      {delta >= 0 ? "+" : "−"}
      {fmt(delta)} vs last month
    </span>
  );
}

function Plot({
  data,
  width,
  hover,
  setHover,
}: {
  data: Point[];
  width: number;
  hover: number | null;
  setHover: (i: number | null) => void;
}) {
  const values = data.map((p) => p.total);
  const yTicks = ticks(Math.min(...values), Math.max(...values));
  const yMin = yTicks[0];
  const yMax = Math.max(yTicks[yTicks.length - 1], Math.max(...values));
  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const line = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`;
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64)));
  // Beyond three years, label only Januaries (as years), every n-th year so they fit.
  const yearly = data.length > 36;
  const yearEvery = Math.max(1, Math.ceil(data.length / 12 / Math.max(2, Math.floor(innerW / 48))));
  // Which months get an axis label: every n-th, plus the last; drop a regular one that would crowd the last.
  const shown = data
    .map((_, i) => i)
    .filter((i) =>
      yearly
        ? data[i].month.endsWith("-01") && Number(data[i].month.slice(0, 4)) % yearEvery === 0
        : i === data.length - 1 || (i % labelEvery === 0 && x(data.length - 1) - x(i) >= 64)
    );
  // On ranges longer than a year, the first label and every change of year carry the year.
  const withYear = new Set(
    data.length > 12 && !yearly ? shown.filter((i, k) => k === 0 || data[i].month.slice(0, 4) !== data[shown[k - 1]].month.slice(0, 4)) : []
  );
  // Guard against an index from a previous, longer range.
  if (hover !== null && hover >= data.length) hover = null;

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.round(rel * (data.length - 1)));
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") setHover(Math.min((hover ?? -1) + 1, data.length - 1));
    else if (e.key === "ArrowLeft") setHover(Math.max((hover ?? data.length) - 1, 0));
    else if (e.key === "Home") setHover(0);
    else if (e.key === "End") setHover(data.length - 1);
    else return;
    e.preventDefault();
  }

  const h = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(x(hover) - 80, 0), width - 168) : 0;

  return (
    <div
      className="relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl"
      tabIndex={0}
      role="img"
      aria-label={`Net worth by month, from ${signed(data[0].total)} in ${monthLabel(data[0].month, true)} to ${signed(data[data.length - 1].total)} in ${monthLabel(data[data.length - 1].month, true)}. Use arrow keys to read each month.`}
      onKeyDown={onKey}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={HEIGHT} className="block max-w-full" aria-hidden="true">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-muted font-mono text-[11px]">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((p, i) =>
          shown.includes(i) ? (
            <text key={p.month} x={x(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted font-mono text-[11px]">
              {yearly ? p.month.slice(0, 4) : monthLabel(p.month)}
              {withYear.has(i) ? ` ’${p.month.slice(2, 4)}` : ""}
            </text>
          ) : null
        )}
        <path d={area} className="fill-accent" opacity={0.12} />
        <path d={line} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-line-strong" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(data[hover].total)} r={5} className="fill-accent stroke-surface" strokeWidth={2} />
          </>
        )}
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].total)} r={4} className="fill-accent stroke-surface" strokeWidth={2} />
        <rect
          x={PAD.left}
          y={0}
          width={innerW}
          height={HEIGHT}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {h && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 w-[168px] rounded-xl border border-line-strong bg-surface px-3 py-2 shadow-lg shadow-black/10 text-xs"
          style={{ left: tipLeft }}
        >
          <p className="font-medium text-fg mb-1">{monthLabel(h.month, true)}</p>
          <p className="flex justify-between"><span className="text-muted">Net worth</span><span className="font-mono text-fg">{signed(h.total)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Cash</span><span className="font-mono text-fg-2">{signed(h.cash)}</span></p>
          <p className="flex justify-between">
            <span className="text-muted">Investments{h.investmentsSource === "cost" && h.investments > 0 ? " (cost)" : ""}</span>
            <span className="font-mono text-fg-2">{signed(h.investments)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
