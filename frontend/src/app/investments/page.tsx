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
  currentPrice: number;
  currentValue: number;
  gainLoss: number;
  gainLossPct: number;
  currency: string;
  dayChange: number;
  dayChangePercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPct: number;
  holdingsCount: number;
  lastUpdated: string;
}

const ASSET_TYPE_STYLES: Record<string, string> = {
  STOCK: "bg-indigo-100 text-indigo-700",
  ETF: "bg-slate-100 text-slate-700",
  CRYPTO: "bg-purple-100 text-purple-700",
};

function assetTypeBadge(type: string) {
  const classes = ASSET_TYPE_STYLES[type] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {type}
    </span>
  );
}

function gainLossColor(value: number) {
  return value >= 0 ? "text-green-600" : "text-red-600";
}

function formatPct(pct: number) {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
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
      const data = await getPortfolio();
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
        <h1 className="text-2xl font-bold text-slate-900">Investments</h1>
      </div>

      {error && (
        <ErrorBanner message={error} onDismiss={() => setError("")} />
      )}

      {/* Hero card */}
      {summary && (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-indigo-200 uppercase tracking-wide">
                Portfolio Value
              </p>
              <p className="text-4xl font-bold mt-1">{fmt(summary.totalValue)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div>
                  <span className="text-xs text-indigo-300 uppercase tracking-wide mr-1">
                    Total Gain/Loss
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      summary.totalGainLoss >= 0 ? "text-green-300" : "text-red-300"
                    }`}
                  >
                    {summary.totalGainLoss >= 0 ? "+" : ""}
                    {fmt(summary.totalGainLoss)}{" "}
                    <span className="text-xs">
                      ({formatPct(summary.totalGainLossPct)})
                    </span>
                  </span>
                </div>
              </div>

              <p className="text-indigo-300 text-xs mt-3">
                Last updated: {formatLastUpdated(summary.lastUpdated)}
              </p>
            </div>

            <button
              onClick={() => loadPortfolio(true)}
              disabled={refreshing}
              aria-label="Refresh portfolio"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
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
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Portfolio holdings">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Asset
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Quantity
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Avg Cost
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Current Price
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Current Value
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Gain / Loss
                  </th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr
                    key={h.ticker}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    {/* Asset */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{h.ticker}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                        {h.name}
                      </p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">{assetTypeBadge(h.assetType)}</td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                      {h.quantity.toLocaleString("en-US", { maximumFractionDigits: 6 })}
                    </td>

                    {/* Avg Cost */}
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                      {fmt(h.avgCostBasis)}
                    </td>

                    {/* Current Price + Day Change */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      <p className="text-slate-900 font-medium">{fmt(h.currentPrice)}</p>
                      <p className={`text-xs mt-0.5 ${gainLossColor(h.dayChange)}`}>
                        {h.dayChange >= 0 ? "+" : ""}
                        {fmt(h.dayChange)} ({formatPct(h.dayChangePercent)})
                      </p>
                    </td>

                    {/* Current Value */}
                    <td className="px-4 py-3 text-right text-slate-900 font-medium tabular-nums">
                      {fmt(h.currentValue)}
                    </td>

                    {/* Gain / Loss */}
                    <td className={`px-4 py-3 text-right font-medium tabular-nums ${gainLossColor(h.gainLoss)}`}>
                      <p>
                        {h.gainLoss >= 0 ? "+" : ""}
                        {fmt(h.gainLoss)}
                      </p>
                      <p className="text-xs mt-0.5">{formatPct(h.gainLossPct)}</p>
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
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View Trade Log →
        </a>
      </div>
    </div>
  );
}
