"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { getAccountSummary, getMonthlySummary, getMonths } from "@/lib/api";
import { fmt, fmtWhole } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";

type Tab = "accounts" | "monthly";

const eyebrow = "font-mono text-[11px] uppercase tracking-[0.08em] text-muted";

function signed(n: number) {
  return `${n >= 0 ? "+" : "−"}${fmt(n)}`;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [error, setError] = useState("");

  // Account summary state
  const [accountData, setAccountData] = useState<any[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Monthly summary state
  const [months, setMonths] = useState<any[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    if (tab === "accounts") {
      setAccountLoading(true);
      getAccountSummary()
        .then((data) => setAccountData(data))
        .catch((e: any) => setError(e.message))
        .finally(() => setAccountLoading(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "monthly") {
      getMonths()
        .then((data: any[]) => {
          const sorted = [...data].sort((a: any, b: any) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          });
          setMonths(sorted);
          if (sorted.length > 0 && !selectedMonthId) {
            setSelectedMonthId(sorted[0].id);
          }
        })
        .catch((e: any) => setError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    // "Choose a month" clears the previous month's figures.
    if (!selectedMonthId) setMonthlyData(null);
    if (selectedMonthId) {
      setMonthlyLoading(true);
      getMonthlySummary(selectedMonthId)
        .then((data) => setMonthlyData(data))
        .catch((e: any) => setError(e.message))
        .finally(() => setMonthlyLoading(false));
    }
  }, [selectedMonthId]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "accounts", label: "By account" },
    { id: "monthly", label: "By month" },
  ];

  return (
    <div>
      <PageHeader title="Reports" />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div
        role="tablist"
        aria-label="Report type"
        className="flex p-1 rounded-xl bg-surface-2 mb-5 sm:mb-6 w-full sm:w-fit"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`tab-${t.id}-panel`}
            onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t.id
                ? "bg-surface text-fg shadow-sm"
                : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "accounts" && (
        <div
          id="tab-accounts-panel"
          role="tabpanel"
          aria-labelledby="tab-accounts"
        >
          {accountLoading ? (
            <LoadingState message="Loading..." />
          ) : accountData.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-line p-6 text-center">
              <p className="text-muted">No account data available.</p>
            </div>
          ) : (
            <AccountsReport
              accounts={accountData}
              open={open}
              onToggle={(id) => setOpen((o) => ({ ...o, [id]: !o[id] }))}
            />
          )}
        </div>
      )}

      {tab === "monthly" && (
        <div
          id="tab-monthly-panel"
          role="tabpanel"
          aria-labelledby="tab-monthly"
        >
          <MonthPicker
            months={months}
            value={selectedMonthId}
            onChange={setSelectedMonthId}
          />

          {monthlyLoading && !monthlyData ? (
            <LoadingState message="Loading..." />
          ) : !monthlyData ? (
            <div className="bg-surface rounded-2xl border border-line p-6 text-center">
              <p className="text-muted">Select a month to view its summary.</p>
            </div>
          ) : (
            <div
              className={
                monthlyLoading
                  ? "opacity-60 transition-opacity"
                  : "transition-opacity"
              }
            >
              <MonthlyReport data={monthlyData} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccountsReport({
  accounts,
  open,
  onToggle,
}: {
  accounts: any[];
  open: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const total = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalIn = accounts.reduce((s, a) => s + (a.totalIn ?? 0), 0);
  const totalOut = accounts.reduce((s, a) => s + (a.totalOut ?? 0), 0);

  return (
    <div className="space-y-5">
      <section
        className="bg-surface rounded-2xl border border-line p-4 sm:p-5"
        aria-label="All accounts"
      >
        <p className={eyebrow}>Total across {accounts.length} accounts</p>
        <p
          className={`mt-1 text-[28px] sm:text-[32px] leading-tight font-semibold font-mono ${total >= 0 ? "text-fg" : "text-neg"}`}
        >
          {total < 0 && "−"}
          {fmt(total)}
        </p>
        <p className="mt-1 text-xs font-mono text-muted">
          <span className="text-pos">in {fmtWhole(totalIn)}</span>
          <span className="mx-1.5 text-faint">·</span>
          <span className="text-neg">out {fmtWhole(totalOut)}</span>
          <span className="mx-1.5 text-faint">·</span>
          paid to date
        </p>
      </section>

      <section aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className={`px-1 mb-2 ${eyebrow}`}>
          Accounts
        </h2>
        <ul
          role="list"
          className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden"
        >
          {accounts.map((acct) => {
            const cats: any[] = acct.categories ?? [];
            const nonZero = cats.filter((c) => Math.abs(c.balance) >= 0.005);
            const isOpen = !!open[acct.id];
            const panelId = `acct-${acct.id}`;
            return (
              <li key={acct.id}>
                <button
                  type="button"
                  onClick={() => onToggle(acct.id)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  disabled={cats.length === 0}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2 transition-colors disabled:hover:bg-transparent"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-medium text-fg truncate">
                      {acct.name}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      <span className="capitalize">{acct.type}</span>
                      {cats.length > 0 &&
                        ` · ${nonZero.length} categor${nonZero.length === 1 ? "y" : "ies"}`}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[15px] font-semibold font-mono ${
                      acct.balance >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {signed(acct.balance)}
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 text-faint transition-transform ${isOpen ? "rotate-180" : ""} ${
                      cats.length === 0 ? "invisible" : ""
                    }`}
                  />
                </button>
                {isOpen && cats.length > 0 && (
                  <CategoryBalances id={panelId} categories={cats} />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function CategoryBalances({
  id,
  categories,
}: {
  id: string;
  categories: any[];
}) {
  const [showZero, setShowZero] = useState(false);
  const nonZero = categories.filter((c) => Math.abs(c.balance) >= 0.005);
  const zeroCount = categories.length - nonZero.length;
  const shown = showZero ? categories : nonZero;

  return (
    <div id={id} className="bg-surface-2/60 border-t border-line px-4 py-2">
      {shown.length === 0 ? (
        <p className="py-2 text-sm text-muted">Every category nets to zero.</p>
      ) : (
        <ul
          role="list"
          className="sm:grid sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3"
        >
          {shown.map((cat) => (
            <li
              key={cat.id}
              className="flex items-baseline justify-between gap-3 py-1.5 text-sm border-b border-line/60 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <span className="min-w-0 truncate text-fg-2">{cat.name}</span>
              <span
                className={`shrink-0 font-mono ${cat.balance >= 0 ? "text-pos" : "text-neg"}`}
              >
                {signed(cat.balance)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {zeroCount > 0 && (
        <button
          type="button"
          onClick={() => setShowZero((s) => !s)}
          className="mt-1 mb-1 py-1.5 text-xs font-medium text-muted hover:text-fg"
        >
          {showZero ? "Hide" : "Show"} {zeroCount} at zero
        </button>
      )}
    </div>
  );
}

function MonthPicker({
  months,
  value,
  onChange,
}: {
  months: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  // months is newest first, so "previous" is the next index.
  const idx = months.findIndex((m) => m.id === value);
  const older = idx >= 0 ? months[idx + 1] : undefined;
  const newer = idx > 0 ? months[idx - 1] : undefined;
  const arrow =
    "w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:border-accent disabled:opacity-40 disabled:hover:border-line-strong transition-colors";

  return (
    <div className="flex items-center gap-2 mb-5 sm:mb-6 sm:max-w-sm">
      <button
        type="button"
        onClick={() => older && onChange(older.id)}
        disabled={!older}
        aria-label="Previous month"
        className={arrow}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <label htmlFor="report-month" className="sr-only">
        Month
      </label>
      <select
        id="report-month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 h-11 px-3 border border-line-strong bg-surface rounded-xl text-sm font-medium text-center focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">Choose a month</option>
        {months.map((m: any) => (
          <option key={m.id} value={m.id}>
            {MONTH_NAMES[m.month - 1]} {m.year}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => newer && onChange(newer.id)}
        disabled={!newer}
        aria-label="Next month"
        className={arrow}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

function MonthlyReport({ data }: { data: any }) {
  const paid = data.paid ?? {};
  const net = paid.net ?? 0;
  const breakdown: any[] = [...(data.categoryBreakdown ?? [])].sort(
    (a, b) =>
      b.spending - a.spending ||
      b.income - a.income ||
      a.name.localeCompare(b.name),
  );
  const maxSpending = Math.max(0, ...breakdown.map((c) => c.spending));

  const tiles = [
    {
      label: "Income",
      value: `+${fmtWhole(paid.income ?? 0)}`,
      title: fmt(paid.income ?? 0),
      color: "text-pos",
    },
    {
      label: "Spending",
      value: `−${fmtWhole(paid.spending ?? 0)}`,
      title: fmt(paid.spending ?? 0),
      color: "text-neg",
    },
    {
      label: "Transfers",
      value: fmtWhole(paid.transfers ?? 0),
      title: fmt(paid.transfers ?? 0),
      color: "text-fg-2",
    },
  ];

  return (
    <div className="space-y-5">
      <section
        className="bg-surface rounded-2xl border border-line p-4 sm:p-5"
        aria-label="Month summary"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={eyebrow}>Net · paid</p>
            <p
              className={`mt-1 text-[28px] sm:text-[32px] leading-tight font-semibold font-mono ${net >= 0 ? "text-pos" : "text-neg"}`}
            >
              {signed(net)}
            </p>
          </div>
          {data.monthId && (
            <Link
              href={`/months/${data.monthId}`}
              className="shrink-0 inline-flex items-center gap-0.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Open month
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="rounded-xl bg-surface-2 px-3 py-2.5 min-w-0"
            >
              <dt className="text-xs text-muted">{t.label}</dt>
              <dd
                className={`mt-0.5 text-[15px] sm:text-base font-semibold font-mono truncate ${t.color}`}
                title={t.title}
              >
                {t.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {breakdown.length > 0 && (
        <section aria-labelledby="breakdown-heading">
          <div className="flex items-baseline justify-between px-1 mb-2">
            <h2 id="breakdown-heading" className={eyebrow}>
              By category
            </h2>
            <span className="text-xs text-muted">Paid, excl. transfers</span>
          </div>
          <ul
            role="list"
            className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden"
          >
            {breakdown.map((cat) => (
              <li key={cat.id} className="px-4 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[15px] font-medium text-fg">
                    {cat.name}
                  </span>
                  <span
                    className={`shrink-0 text-[15px] font-semibold font-mono ${cat.net >= 0 ? "text-pos" : "text-fg"}`}
                  >
                    {signed(cat.net)}
                  </span>
                </div>
                {cat.spending > 0 && (
                  <div className="mt-1.5 flex items-center gap-3">
                    <span
                      className="flex-1 h-1 rounded-full bg-surface-2 overflow-hidden"
                      aria-hidden="true"
                    >
                      {maxSpending > 0 && (
                        <span
                          className="block h-full rounded-full bg-accent"
                          style={{
                            width: `${(cat.spending / maxSpending) * 100}%`,
                          }}
                        />
                      )}
                    </span>
                    {cat.income > 0 && cat.spending > 0 && (
                      <span className="shrink-0 text-xs font-mono text-muted">
                        <span className="text-pos">in +{fmt(cat.income)}</span>
                        <span className="mx-1 text-faint">·</span>
                        out −{fmt(cat.spending)}
                      </span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
