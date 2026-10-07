"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { Billing, COMPARISON, PLANS } from "@/lib/plans";
import { SIGN_UP } from "@/lib/links";

function price(monthly: number, yearly: number, billing: Billing) {
  if (monthly === 0) return { main: "CHF 0", sub: "forever" };
  return billing === "monthly"
    ? { main: `CHF ${monthly}`, sub: "per month" }
    : { main: `CHF ${(yearly / 12).toFixed(2).replace(/\.00$/, "")}`, sub: `per month, CHF ${yearly} a year` };
}

export function PricingPlans() {
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <>
      <div className="flex justify-center">
        <div role="radiogroup" aria-label="Billing" className="inline-flex p-1 rounded-xl bg-surface-2 border border-line">
          {(["monthly", "yearly"] as Billing[]).map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={billing === b}
              onClick={() => setBilling(b)}
              className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors ${
                billing === b ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
              }`}
            >
              {b === "monthly" ? "Monthly" : "Yearly"}
              {b === "yearly" && (
                <span className="ml-2 px-1.5 py-0.5 rounded-md bg-accent-soft text-accent-text text-[11px] font-semibold">2 months free</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-10 grid gap-4 lg:grid-cols-3 items-stretch">
        {PLANS.map((p) => {
          const { main, sub } = price(p.monthly, p.yearly, billing);
          return (
            <li
              key={p.id}
              className={`relative rounded-3xl p-6 sm:p-7 flex flex-col border ${
                p.highlight ? "border-accent bg-surface shadow-[0_30px_80px_-40px_rgba(245,179,31,0.6)]" : "border-line bg-surface"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 h-6 px-2.5 inline-flex items-center rounded-full bg-accent text-accent-ink text-xs font-semibold">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-muted min-h-[2.5rem]">{p.tagline}</p>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-tight">{main}</span>
              </p>
              <p className="mt-1 text-sm text-muted">{sub}</p>
              <a
                href={`${SIGN_UP}${p.id === "free" ? "" : `&plan=${p.id}`}`}
                className={`mt-6 h-12 inline-flex items-center justify-center rounded-xl font-semibold ${
                  p.highlight
                    ? "bg-accent text-accent-ink hover:brightness-95"
                    : "border border-line-strong hover:border-fg-2"
                }`}
              >
                {p.cta}
              </a>
              <ul className="mt-7 space-y-3 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 text-fg-2">
                    <Check size={17} strokeWidth={2.5} className="mt-0.5 shrink-0 text-accent-text" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check size={18} strokeWidth={2.5} className="mx-auto text-accent-text" aria-label="Included" />;
  if (v === false) return <Minus size={18} className="mx-auto text-faint" aria-label="Not included" />;
  return <span className="text-sm text-fg-2">{v}</span>;
}

/** Full comparison: a table from md up, one list per plan on phones. */
export function Comparison() {
  const ids = ["free", "plus", "pro"] as const;
  return (
    <>
      <div className="hidden md:block rounded-3xl border border-line bg-surface overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="p-5 text-sm font-medium text-muted w-[40%]">
                Compare plans
              </th>
              {PLANS.map((p) => (
                <th key={p.id} scope="col" className="p-5 text-center font-semibold">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          {COMPARISON.map((g) => (
            <tbody key={g.group}>
              <tr>
                <th colSpan={4} scope="colgroup" className="px-5 pt-6 pb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
                  {g.group}
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="px-5 py-3.5 text-[15px] font-normal text-fg-2">
                    {r.label}
                  </th>
                  {ids.map((id) => (
                    <td key={id} className="px-5 py-3.5 text-center">
                      <Cell v={r[id]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {PLANS.map((p) => (
          <details key={p.id} className="group rounded-2xl border border-line bg-surface" open={p.highlight}>
            <summary className="flex items-center justify-between px-5 h-14 cursor-pointer list-none font-semibold">
              Everything in {p.name}
              <span className="text-muted text-xl transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <div className="px-5 pb-5">
              {COMPARISON.map((g) => (
                <div key={g.group} className="mt-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-faint">{g.group}</p>
                  <ul className="mt-1 divide-y divide-line">
                    {g.rows.map((r) => (
                      <li key={r.label} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
                        <span className={r[p.id] === false ? "text-faint" : "text-fg-2"}>{r.label}</span>
                        <span className="shrink-0 min-w-[1.5rem] text-right">
                          <Cell v={r[p.id]} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
