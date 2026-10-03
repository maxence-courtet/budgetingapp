"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { getAccount, getTransactions } from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";

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
    return <LoadingState message="Loading account..." />;
  }

  if (!account && !error) {
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
    if (t.type === "INCOME") {
      const catName = t.category?.name ?? t.categoryName ?? "Uncategorized";
      const catId = t.categoryId ?? catName;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { name: catName, balance: 0 });
      }
      categoryMap.get(catId)!.balance += t.amount ?? 0;
    } else if (t.type === "SPENDING") {
      const catName = t.category?.name ?? t.categoryName ?? "Uncategorized";
      const catId = t.categoryId ?? catName;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, { name: catName, balance: 0 });
      }
      categoryMap.get(catId)!.balance -= t.amount ?? 0;
    } else if (t.type === "TRANSFER") {
      // Outgoing transfer: use categoryId (from category)
      if (t.fromAccountId === id) {
        const catName = t.category?.name ?? t.categoryName ?? "Uncategorized";
        const catId = t.categoryId ?? catName;
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, { name: catName, balance: 0 });
        }
        categoryMap.get(catId)!.balance -= t.amount ?? 0;
      }
      // Incoming transfer: use toCategoryId (to category)
      if (t.toAccountId === id) {
        const catName = t.toCategory?.name ?? "Uncategorized";
        const catId = t.toCategoryId ?? t.categoryId ?? catName;
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, { name: catName, balance: 0 });
        }
        categoryMap.get(catId)!.balance += t.amount ?? 0;
      }
    }
  }
  const categoryBalances = Array.from(categoryMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-8">
      {error && <ErrorBanner message={error} />}

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
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Category
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
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
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Date
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Description
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-slate-600">
                    Amount
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
                    Category
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-slate-600">
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
                      <TypeBadge type={t.type} />
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
                      <StatusBadge status={t.status} />
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
