"use client";

import { useEffect, useState } from "react";
import { getAccountSummary, getMonthlySummary, getMonths } from "@/lib/api";

const fmt = (n: number) =>
  "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Tab = "accounts" | "monthly";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("accounts");

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
        .catch(console.error)
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
        .catch(console.error);
    }
  }, [tab]);

  useEffect(() => {
    if (selectedMonthId) {
      setMonthlyLoading(true);
      getMonthlySummary(selectedMonthId)
        .then((data) => setMonthlyData(data))
        .catch(console.error)
        .finally(() => setMonthlyLoading(false));
    }
  }, [selectedMonthId]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Reports</h1>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setTab("accounts")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "accounts"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Account Summary
        </button>
        <button
          onClick={() => setTab("monthly")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "monthly"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {tab === "accounts" && (
        <div>
          {accountLoading ? (
            <p className="text-slate-500 py-8 text-center">Loading...</p>
          ) : accountData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No account data available.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {accountData.map((acct: any) => (
                <div
                  key={acct.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{acct.name}</h3>
                      <span className="text-sm text-slate-500">{acct.type}</span>
                    </div>
                    <span
                      className={`text-xl font-mono font-semibold ${
                        acct.balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {acct.balance >= 0 ? "+" : "-"}
                      {fmt(acct.balance)}
                    </span>
                  </div>

                  {acct.categories && acct.categories.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-medium text-slate-600">Category</th>
                          <th className="text-right py-2 font-medium text-slate-600">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acct.categories.map((cat: any) => (
                          <tr key={cat.id} className="border-b border-slate-50">
                            <td className="py-2 text-slate-700">{cat.name}</td>
                            <td
                              className={`py-2 text-right font-mono ${
                                cat.balance >= 0 ? "text-green-600" : "text-red-600"
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
        <div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Month
            </label>
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            <p className="text-slate-500 py-8 text-center">Loading...</p>
          ) : !monthlyData ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-500">Select a month to view its summary.</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Paid Income</p>
                  <p className="text-xl font-mono font-semibold text-green-600">
                    +{fmt(monthlyData.paid?.income ?? 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Paid Spending</p>
                  <p className="text-xl font-mono font-semibold text-red-600">
                    -{fmt(monthlyData.paid?.spending ?? 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Net</p>
                  <p
                    className={`text-xl font-mono font-semibold ${
                      (monthlyData.paid?.net ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {(monthlyData.paid?.net ?? 0) >= 0 ? "+" : "-"}
                    {fmt(monthlyData.paid?.net ?? 0)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                  <p className="text-sm text-slate-500 mb-1">Transfers</p>
                  <p className="text-xl font-mono font-semibold text-blue-600">
                    {fmt(monthlyData.paid?.transfers ?? 0)}
                  </p>
                </div>
              </div>

              {monthlyData.categoryBreakdown && monthlyData.categoryBreakdown.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Category Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600">Income</th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600">Spending</th>
                          <th className="text-right px-4 py-3 font-medium text-slate-600">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.categoryBreakdown.map((cat: any) => (
                          <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-900 font-medium">{cat.name}</td>
                            <td className="px-4 py-3 text-right font-mono text-green-600">
                              {cat.income > 0 ? `+${fmt(cat.income)}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-red-600">
                              {cat.spending > 0 ? `-${fmt(cat.spending)}` : "-"}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-mono ${
                                cat.net >= 0 ? "text-green-600" : "text-red-600"
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
