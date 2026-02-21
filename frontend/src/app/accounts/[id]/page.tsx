"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { getAccount, getTransactions } from "@/lib/api";

const fmt = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

export default function AccountDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [acct, txns] = await Promise.all([
          getAccount(id),
          getTransactions({ accountId: id }),
        ]);
        setAccount(acct);
        setTransactions(Array.isArray(txns) ? txns : txns.data ?? []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Loading account...</p>
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

  if (!account) {
    return (
      <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-lg p-4">
        Account not found.
      </div>
    );
  }

  // Build category balances from transactions
  const categoryMap = new Map<
    string,
    { name: string; balance: number }
  >();
  for (const t of transactions) {
    const catName = t.category?.name ?? t.categoryName ?? "Uncategorized";
    const catId = t.categoryId ?? catName;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { name: catName, balance: 0 });
    }
    const entry = categoryMap.get(catId)!;
    if (t.type === "INCOME") {
      entry.balance += t.amount ?? 0;
    } else if (t.type === "SPENDING") {
      entry.balance -= t.amount ?? 0;
    } else if (t.type === "TRANSFER") {
      // Incoming transfer (this account is the destination) counts as income
      if (t.toAccountId === id) {
        entry.balance += t.amount ?? 0;
      }
      // Outgoing transfer (this account is the source) counts as spending
      if (t.fromAccountId === id) {
        entry.balance -= t.amount ?? 0;
      }
    }
  }
  const categoryBalances = Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/accounts"
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        &larr; Back to Accounts
      </Link>

      {/* Account Header */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide capitalize">
              {account.type?.replace("_", " ")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {account.name}
            </h1>
            {account.notes && (
              <p className="text-sm text-slate-500 mt-2">{account.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Balance</p>
            <p
              className={`text-3xl font-bold ${
                (account.balance ?? 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(account.balance ?? 0) < 0 ? "-" : ""}
              {fmt(account.balance ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Category Balances */}
      {categoryBalances.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Category Balances
          </h2>
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryBalances.map((c) => (
                  <tr
                    key={c.name}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-900 font-medium">
                      {c.name}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        c.balance >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {c.balance < 0 ? "-" : "+"}
                      {fmt(c.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Transactions
        </h2>
        {transactions.length === 0 ? (
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 text-center text-slate-500">
            No transactions for this account.
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
                    Category
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
                      {t.type === "INCOME"
                        ? "+"
                        : t.type === "SPENDING"
                        ? "-"
                        : ""}
                      {fmt(t.amount ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.category?.name ?? t.categoryName ?? "-"}
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
