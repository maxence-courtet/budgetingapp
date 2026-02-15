"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAccounts, getMonths, getTransactions } from "@/lib/api";

const fmt = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

export default function Dashboard() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [months, setMonths] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
        {error}
      </div>
    );
  }

  const totalBalance = accounts.reduce(
    (sum: number, a: any) => sum + (a.balance ?? 0),
    0
  );

  const now = new Date();
  const currentMonth = months.find(
    (m: any) => m.month === now.getMonth() + 1 && m.year === now.getFullYear()
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            href="/months"
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Create Month
          </Link>
          <Link
            href="/search"
            className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Total Balance */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
          Total Balance
        </p>
        <p
          className={`text-3xl font-bold mt-1 ${
            totalBalance >= 0 ? "text-slate-900" : "text-red-600"
          }`}
        >
          {totalBalance < 0 ? "-" : ""}
          {fmt(totalBalance)}
        </p>
      </div>

      {/* Account Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Accounts</h2>
        {accounts.length === 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 text-center text-slate-500">
            No accounts yet.{" "}
            <Link href="/accounts" className="text-slate-900 underline">
              Create one
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((a: any) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 hover:border-slate-300 transition-colors"
              >
                <p className="text-sm font-medium text-slate-500 capitalize">
                  {a.type?.replace("_", " ") ?? "Account"}
                </p>
                <p className="text-base font-semibold text-slate-900 mt-1">
                  {a.name}
                </p>
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
      </div>

      {/* Current Month Overview */}
      {currentMonth && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Current Month -{" "}
            {new Date(currentMonth.year, currentMonth.month - 1).toLocaleString(
              "en-US",
              { month: "long", year: "numeric" }
            )}
          </h2>
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-500">Income</p>
                <p className="text-lg font-bold text-green-600">
                  {fmt(currentMonth.income ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Spending</p>
                <p className="text-lg font-bold text-red-600">
                  {fmt(currentMonth.spending ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Net</p>
                <p
                  className={`text-lg font-bold ${
                    (currentMonth.net ?? 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {fmt(currentMonth.net ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Recent Transactions
        </h2>
        {transactions.length === 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 text-center text-slate-500">
            No transactions yet.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Description
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t: any) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-700">
                      {t.date?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {t.description}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          t.type === "INCOME"
                            ? "bg-green-100 text-green-700"
                            : t.type === "TRANSFER"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        t.type === "INCOME"
                          ? "text-green-600"
                          : t.type === "SPENDING"
                          ? "text-red-600"
                          : "text-blue-600"
                      }`}
                    >
                      {t.type === "INCOME" ? "+" : t.type === "SPENDING" ? "-" : ""}
                      {fmt(t.amount ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 uppercase">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
