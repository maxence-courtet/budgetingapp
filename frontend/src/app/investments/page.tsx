"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, ListOrdered } from "lucide-react";
import { getPortfolio } from "@/lib/api";
import { fmt, getDisplayCurrency } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { InvestmentAccounts, InvestmentAccount } from "@/components/InvestmentAccounts";

interface Holding {
  ticker: string;
  assetType: string;
  name: string;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number | null;
  priceAvailable: boolean;
  costBasisTotal: number;
  currentValue: number;
  gainLoss: number | null;
  gainLossPct: number | null;
  currency: string;
  dayChange: number | null;
  dayChangePercent: number | null;
}

interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  holdingsCount: number;
  unpricedCount: number;
  currencies: string[];
  lastUpdated: string | null;
}

const ASSET_TYPE_STYLES: Record<string, string> = {
  STOCK: "bg-accent-soft text-accent-strong",
  ETF: "bg-surface-2 text-fg-2",
  CRYPTO: "bg-purple-100 text-purple-700",
};

function assetTypeBadge(type: string) {
  const classes = ASSET_TYPE_STYLES[type] ?? "bg-surface-2 text-fg-2";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-medium tracking-[0.04em] ${classes}`}>
      {type}
    </span>
  );
}

function gainLossColor(value: number | null) {
  return value == null ? "text-muted" : value >= 0 ? "text-pos" : "text-neg";
}

/** Always signed, so a loss never reads as a gain when the colour isn't seen. */
function signedMoney(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(n)}`;
}

function formatPct(pct: number) {
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

function formatLastUpdated(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function InvestmentsPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadPortfolio = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const data = await getPortfolio(isRefresh);
      setHoldings(data.holdings ?? []);
      setSummary(data.summary ?? null);
      setAccounts(data.accounts ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  if (loading) {
    return <LoadingState message="Loading portfolio..." />;
  }

  const allUnpriced = !!summary && summary.holdingsCount > 0 && summary.unpricedCount === summary.holdingsCount;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Investments"
        action={
          <Link
            href="/investments/trades"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
          >
            <ListOrdered size={16} aria-hidden="true" /> Trades
          </Link>
        }
      />

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {summary && holdings.length > 0 && (
        <section aria-label="Portfolio summary" className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Portfolio value</p>
            <button
              onClick={() => loadPortfolio(true)}
              disabled={refreshing}
              aria-label="Refresh prices"
              title="Refresh prices"
              className="-mt-2 -mr-2 flex items-center justify-center gap-2 w-9 h-9 sm:w-auto sm:px-3 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface-2 transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
          <p className="mt-1 font-mono text-[36px] sm:text-5xl font-medium tracking-[-0.04em] leading-none text-fg">
            {fmt(summary.totalValue)}
          </p>
          {allUnpriced ? (
            <p className="mt-3 font-mono text-base text-muted" title="No live prices right now">Gain —</p>
          ) : (
            <p className={`mt-3 font-mono text-base sm:text-lg font-medium ${gainLossColor(summary.totalGainLoss)}`}>
              {signedMoney(summary.totalGainLoss)}{" "}
              <span className="text-sm">({formatPct(summary.totalGainLossPct)})</span>
              <span className="ml-1.5 font-sans text-xs font-normal text-muted">total gain</span>
            </p>
          )}
          <p className="mt-3 text-xs text-muted">
            {summary.holdingsCount} holding{summary.holdingsCount === 1 ? "" : "s"} ·{" "}
            {summary.lastUpdated ? `prices ${formatLastUpdated(summary.lastUpdated)}` : "live prices unavailable"}
          </p>
        </section>
      )}

      <InvestmentAccounts accounts={accounts} onChange={() => loadPortfolio()} />

      {summary && summary.unpricedCount > 0 && (
        <p role="status" className="text-sm rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 px-4 py-3">
          Live prices are unavailable for {summary.unpricedCount} of {summary.holdingsCount} holdings right now, so{" "}
          {summary.unpricedCount === 1 ? "it is" : "they are"} valued at what you paid. Try Refresh in a few minutes.
        </p>
      )}
      {summary && summary.currencies?.length > 1 && (
        <p className="text-xs text-muted">
          Holdings are priced in {summary.currencies.join(" and ")}; totals add them without currency conversion.
        </p>
      )}

      {holdings.length === 0 ? (
        accounts.length > 0 && <EmptyState
          message="No trades recorded yet."
          cta={{
            label: "Add your first trade",
            onClick: () => router.push("/investments/trades"),
          }}
        />
      ) : (
        <section aria-labelledby="holdings-h">
          <h2 id="holdings-h" className="text-base font-semibold text-fg mb-3">Holdings</h2>
          <div className="bg-surface border border-line rounded-2xl overflow-hidden">
            {/* Column labels for the wider layout; phones read each row on its own. */}
            <div
              aria-hidden="true"
              className="hidden md:grid grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-4 px-4 py-2.5 bg-surface-2 border-b border-line font-mono text-[11px] uppercase tracking-[0.08em] text-muted"
            >
              <span>Asset</span>
              <span className="text-right">Quantity · avg cost</span>
              <span className="text-right">Price</span>
              <span className="text-right">Value</span>
              <span className="text-right">Gain / loss</span>
            </div>
            <ul role="list" aria-label="Portfolio holdings" className="divide-y divide-line">
              {holdings.map((h) => {
                const qty = h.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 });
                const priced = h.priceAvailable && h.currentPrice != null;
                const gain =
                  h.gainLoss == null ? (
                    <span className="text-xs text-muted">—</span>
                  ) : (
                    <>
                      {signedMoney(h.gainLoss)}
                      {h.gainLossPct != null && (
                        <span className="text-xs font-normal"> {formatPct(h.gainLossPct)}</span>
                      )}
                    </>
                  );
                return (
                  <li key={h.ticker} className="px-4 py-3">
                    {/* Phone: symbol and value on top, quantity and gain below. */}
                    <div className="md:hidden">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-fg">{h.ticker}</span>
                          {assetTypeBadge(h.assetType)}
                        </span>
                        <span className="font-mono text-[15px] font-semibold text-fg shrink-0">{fmt(h.currentValue)}</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-muted truncate min-w-0">
                          {qty} × {priced ? fmt(h.currentPrice!) : "price n/a"}
                          {h.currency && h.currency !== getDisplayCurrency() ? ` ${h.currency}` : ""}
                        </span>
                        <span className={`font-mono font-medium shrink-0 ${gainLossColor(h.gainLoss)}`}>{gain}</span>
                      </div>
                    </div>

                    <div className="hidden md:grid grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] gap-4 items-center text-sm">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="font-semibold text-fg">{h.ticker}</span>
                          {assetTypeBadge(h.assetType)}
                        </p>
                        {h.name && h.name !== h.ticker && <p className="text-xs text-muted mt-0.5 truncate">{h.name}</p>}
                      </div>
                      <div className="text-right tabular-nums">
                        <p className="text-fg-2">{qty}</p>
                        <p className="text-xs text-muted mt-0.5">avg {fmt(h.avgCostBasis)}</p>
                      </div>
                      <div className="text-right tabular-nums">
                        {priced ? (
                          <>
                            <p className="text-fg">
                              {fmt(h.currentPrice!)}
                              {h.currency && h.currency !== getDisplayCurrency() && <span className="ml-1 text-xs text-muted">{h.currency}</span>}
                            </p>
                            {h.dayChange != null && h.dayChangePercent != null && (
                              <p className={`text-xs mt-0.5 ${gainLossColor(h.dayChange)}`}>
                                {signedMoney(h.dayChange)} today ({formatPct(h.dayChangePercent)})
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted">Price unavailable</p>
                        )}
                      </div>
                      <p className="text-right font-mono font-medium text-fg">{fmt(h.currentValue)}</p>
                      <p className={`text-right font-mono font-medium ${gainLossColor(h.gainLoss)}`}>{gain}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
