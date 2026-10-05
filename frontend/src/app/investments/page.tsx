"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { getPortfolio } from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";

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
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-semibold tracking-tight text-fg">Investments</h1>
      </div>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Hero card */}
      {summary && (
        <section aria-label="Portfolio summary" className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-2">
            <p className="font-mono text-xs text-muted uppercase tracking-[0.08em]">Portfolio value</p>
            <p className="font-mono text-5xl font-medium tracking-[-0.04em] leading-none text-fg">
              {fmt(summary.totalValue)}
            </p>
            <p className="text-xs text-muted">
              {summary.lastUpdated ? `Prices updated ${formatLastUpdated(summary.lastUpdated)}` : "Live prices unavailable"}
            </p>
          </div>
          <div className="flex items-end gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted">Total gain/loss</p>
              <p className={`font-mono text-xl ${gainLossColor(summary.totalGainLoss)}`}>
                {signedMoney(summary.totalGainLoss)}{" "}
                <span className="text-sm">({formatPct(summary.totalGainLossPct)})</span>
              </p>
            </div>
            <button
              onClick={() => loadPortfolio(true)}
              disabled={refreshing}
              aria-label="Refresh portfolio"
              className="flex items-center gap-2 h-9 px-3.5 text-sm font-medium rounded-lg border border-line-strong text-fg hover:border-accent hover:text-accent transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </section>
      )}

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

      {/* Holdings table or empty state */}
      {holdings.length === 0 ? (
        <EmptyState
          message="No trades recorded yet."
          cta={{
            label: "Add your first trade",
            onClick: () => router.push("/investments/trades"),
          }}
        />
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Portfolio holdings">
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Asset
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Type
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Quantity
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Avg Cost
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Current Price
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Current Value
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Gain / Loss
                  </th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr
                    key={h.ticker}
                    className="border-b border-line last:border-0 hover:bg-surface-2"
                  >
                    {/* Asset */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-fg">{h.ticker}</p>
                      <p className="text-xs text-muted mt-0.5 truncate max-w-[180px]">
                        {h.name}
                      </p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">{assetTypeBadge(h.assetType)}</td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-right text-fg-2 tabular-nums">
                      {h.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                    </td>

                    {/* Avg Cost */}
                    <td className="px-4 py-3 text-right text-fg-2 tabular-nums">
                      {fmt(h.avgCostBasis)}
                    </td>

                    {/* Current Price + Day Change */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {h.priceAvailable && h.currentPrice != null ? (
                        <>
                          <p className="text-fg font-medium">
                            {fmt(h.currentPrice)}
                            {h.currency && h.currency !== "USD" && <span className="ml-1 text-xs text-muted">{h.currency}</span>}
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
                    </td>

                    {/* Current Value */}
                    <td className="px-4 py-3 text-right text-fg font-medium tabular-nums">
                      {fmt(h.currentValue)}
                    </td>

                    {/* Gain / Loss */}
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${gainLossColor(h.gainLoss)}`}>
                      {h.gainLoss == null ? (
                        <p className="text-xs">—</p>
                      ) : (
                        <>
                          <p>{signedMoney(h.gainLoss)}</p>
                          {h.gainLossPct != null && <p className="text-xs mt-0.5">{formatPct(h.gainLossPct)}</p>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="text-right">
        <a
          href="/investments/trades"
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          View Trade Log →
        </a>
      </div>
    </div>
  );
}
