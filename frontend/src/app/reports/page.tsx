"use client";

import { useEffect, useState } from "react";
import { getAccountSummary, getMonthlySummary, getMonths } from "@/lib/api";
import { fmt } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

type Tab = "accounts" | "monthly";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [error, setError] = useState("");

  // Account summary state
  const [accountData, setAccountData] = useState<any[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);

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
  }, [tab]);

  useEffect(() => {
    if (selectedMonthId) {
      setMonthlyLoading(true);
      getMonthlySummary(selectedMonthId)
        .then((data) => setMonthlyData(data))
        .catch((e: any) => setError(e.message))
        .finally(() => setMonthlyLoading(false));
    }
  }, [selectedMonthId]);

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-fg mb-6">Reports</h1>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div role="tablist" aria-label="Report type" className="flex gap-1 bg-surface-2 p-1 rounded-xl mb-6 w-fit">
        <button
          id="tab-accounts"
          role="tab"
          aria-selected={tab === "accounts"}
          aria-controls="tab-accounts-panel"
          onClick={() => setTab("accounts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "accounts"
              ? "bg-surface text-fg"
              : "text-muted hover:text-fg"
          }`}
        >
          Account Summary
        </button>
        <button
          id="tab-monthly"
          role="tab"
          aria-selected={tab === "monthly"}
          aria-controls="tab-monthly-panel"
          onClick={() => setTab("monthly")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "monthly"
              ? "bg-surface text-fg"
              : "text-muted hover:text-fg"
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {tab === "accounts" && (
        <div id="tab-accounts-panel" role="tabpanel" aria-labelledby="tab-accounts">
          {accountLoading ? (
            <LoadingState message="Loading..." />
          ) : accountData.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-line p-8 text-center">
              <p className="text-muted">No account data available.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {accountData.map((acct: any) => (
                <div
                  key={acct.id}
                  className="bg-surface rounded-2xl border border-line p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-fg">{acct.name}</h2>
                      <span className="text-sm text-muted">{acct.type}</span>
                    </div>
                    <span
                      className={`text-xl font-mono font-semibold ${
                        acct.balance >= 0 ? "text-pos" : "text-neg"
                      }`}
                    >
                      {acct.balance >= 0 ? "+" : "-"}
                      {fmt(acct.balance)}
                    </span>
                  </div>

                  {acct.categories && acct.categories.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line">
                          <th scope="col" className="text-left px-4 py-2 font-medium text-muted">Category</th>
                          <th scope="col" className="text-right px-4 py-2 font-medium text-muted">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acct.categories.map((cat: any) => (
                          <tr key={cat.id} className="border-b border-line">
                            <td className="px-4 py-2 text-fg-2">{cat.name}</td>
                            <td
                              className={`px-4 py-2 text-right font-mono ${
                                cat.balance >= 0 ? "text-pos" : "text-neg"
                              }`}
                            >
                              {cat.balance >= 0 ? "+" : "-"}
                              {fmt(cat.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "monthly" && (
        <div id="tab-monthly-panel" role="tabpanel" aria-labelledby="tab-monthly">
          <div className="mb-6">
            <label className="block text-sm font-medium text-fg-2 mb-1">
              Select Month
            </label>
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <option value="">Choose a month</option>
              {months.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {MONTH_NAMES[m.month - 1]} {m.year}
                </option>
              ))}
            </select>
          </div>

          {monthlyLoading ? (
            <LoadingState message="Loading..." />
          ) : !monthlyData ? (
            <div className="bg-surface rounded-2xl border border-line p-8 text-center">
              <p className="text-muted">Select a month to view its summary.</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface rounded-2xl border border-line p-4">
                  <p className="text-sm text-muted mb-1">Paid Income</p>
                  <p className="text-xl font-mono font-semibold text-pos">
                    +{fmt(monthlyData.paid?.income ?? 0)}
                  </p>
                </div>
                <div className="bg-surface rounded-2xl border border-line p-4">
                  <p className="text-sm text-muted mb-1">Paid Spending</p>
                  <p className="text-xl font-mono font-semibold text-neg">
                    -{fmt(monthlyData.paid?.spending ?? 0)}
                  </p>
                </div>
                <div className="bg-surface rounded-2xl border border-line p-4">
                  <p className="text-sm text-muted mb-1">Net</p>
                  <p
                    className={`text-xl font-mono font-semibold ${
                      (monthlyData.paid?.net ?? 0) >= 0 ? "text-pos" : "text-neg"
                    }`}
                  >
                    {(monthlyData.paid?.net ?? 0) >= 0 ? "+" : "-"}
                    {fmt(monthlyData.paid?.net ?? 0)}
                  </p>
                </div>
                <div className="bg-surface rounded-2xl border border-line p-4">
                  <p className="text-sm text-muted mb-1">Transfers</p>
                  <p className="text-xl font-mono font-semibold text-muted">
                    {fmt(monthlyData.paid?.transfers ?? 0)}
                  </p>
                </div>
              </div>

              {monthlyData.categoryBreakdown && monthlyData.categoryBreakdown.length > 0 && (
                <div className="bg-surface rounded-2xl border border-line overflow-hidden">
                  <div className="px-5 py-4 border-b border-line">
                    <h3 className="text-lg font-semibold text-fg">Category Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-line bg-surface-2">
                          <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Category</th>
                          <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Income</th>
                          <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Spending</th>
                          <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.categoryBreakdown.map((cat: any) => (
                          <tr key={cat.id} className="border-b border-line hover:bg-surface-2">
                            <td className="px-4 py-3 text-fg font-medium">{cat.name}</td>
                            <td className="px-4 py-3 text-right font-mono text-pos">
                              {cat.income > 0 ? `+${fmt(cat.income)}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-neg">
                              {cat.spending > 0 ? `-${fmt(cat.spending)}` : "-"}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-mono ${
                                cat.net >= 0 ? "text-pos" : "text-neg"
                              }`}
                            >
                              {cat.net >= 0 ? "+" : "-"}
                              {fmt(cat.net)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
