"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAccounts, getMonths, getTransactions } from "@/lib/api";
import { fmt, formatAmount } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AiInsightsCard } from "@/components/AiInsightsCard";
import { Account, Month, Transaction } from "@/lib/types";
import { TrendingUp, Plus } from "lucide-react";

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [months, setMonths] = useState<Month[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [accts, mos, txns] = await Promise.all([
          getAccounts(),
          getMonths(),
          getTransactions({ limit: "10", sort: "date:desc" }),
        ]);
        setAccounts(accts);
        setMonths(mos);
        setTransactions(Array.isArray(txns) ? txns : txns.data ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorBanner message={error} />;

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

  const now = new Date();
  const currentMonth = months.find(
    (m) => m.month === now.getMonth() + 1 && m.year === now.getFullYear()
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/months"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} aria-hidden="true" />
            Create Month
          </Link>
        </div>
      </div>

      {/* Total Balance hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-6 text-white shadow-md">
        <p className="text-sm font-medium text-indigo-200 uppercase tracking-wide">
          Total Balance
        </p>
        <p className="text-4xl font-bold mt-1">
          {totalBalance < 0 ? "-" : ""}
          {fmt(totalBalance)}
        </p>
        <p className="text-indigo-200 text-sm mt-1">
          across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </p>
      </div>

      <AiInsightsCard />

      {/* Account Cards */}
      <section aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="text-lg font-semibold text-slate-900 mb-3">
          Accounts
        </h2>
        {accounts.length === 0 ? (
          <EmptyState
            message="No accounts yet."
            cta={{ label: "Create your first account", onClick: () => window.location.href = "/accounts" }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide capitalize">
                  {a.type?.replace("_", " ") ?? "Account"}
                </p>
                <p className="text-base font-semibold text-slate-900 mt-1">{a.name}</p>
                <p
                  className={`text-xl font-bold mt-2 ${
                    (a.balance ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {(a.balance ?? 0) < 0 ? "-" : ""}
                  {fmt(a.balance ?? 0)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Current Month Overview */}
      {currentMonth ? (
        <section aria-labelledby="month-heading">
          <h2 id="month-heading" className="text-lg font-semibold text-slate-900 mb-3">
            {MONTH_NAMES[currentMonth.month - 1]} {currentMonth.year}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Income", value: currentMonth.income ?? 0, color: "text-green-600", prefix: "+" },
              { label: "Spending", value: currentMonth.spending ?? 0, color: "text-red-600", prefix: "-" },
              { label: "Net", value: currentMonth.net ?? 0, color: (currentMonth.net ?? 0) >= 0 ? "text-green-600" : "text-red-600", prefix: "" },
            ].map(({ label, value, color, prefix }) => (
              <div key={label} className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
                <p className="text-sm text-slate-600">{label}</p>
                <p className={`text-lg font-bold mt-1 ${color}`}>
                  {prefix}{fmt(value)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Link
              href={`/months/${currentMonth.id}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View month details →
            </Link>
          </div>
        </section>
      ) : (
        <section aria-labelledby="month-heading">
          <h2 id="month-heading" className="text-lg font-semibold text-slate-900 mb-3">
            This Month
          </h2>
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 flex items-center gap-4">
            <TrendingUp className="text-slate-400" size={24} aria-hidden="true" />
            <div>
              <p className="text-sm text-slate-600">No month tracked yet for {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}.</p>
              <Link href="/months" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                Create a month to start tracking →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Recent Transactions */}
      <section aria-labelledby="transactions-heading">
        <h2 id="transactions-heading" className="text-lg font-semibold text-slate-900 mb-3">
          Recent Transactions
        </h2>
        {transactions.length === 0 ? (
          <EmptyState message="No transactions yet." />
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Recent transactions">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{t.date?.slice(0, 10)}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{t.description}</td>
                      <td className="px-4 py-3"><TypeBadge type={t.type} /></td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        t.type === "INCOME" ? "text-green-600" : t.type === "SPENDING" ? "text-red-600" : "text-blue-600"
                      }`}>
                        {formatAmount(t.amount, t.type)}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
