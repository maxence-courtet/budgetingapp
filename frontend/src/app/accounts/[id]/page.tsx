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

  if (!account) {
    return (
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <div className="bg-surface-2 border border-line text-muted rounded-xl p-4">
          Account not found. <Link href="/accounts" className="text-accent font-medium">Back to accounts</Link>
        </div>
      </div>
    );
  }

  // Per-category balances come from the API: PAID transactions up to today, signed for this account.
  const categoryBalances: { id: string; name: string; balance: number }[] = account.categoryBalances ?? [];

  return (
    <div className="space-y-8">
      {error && <ErrorBanner message={error} />}

      {/* Back link */}
      <Link
        href="/accounts"
        className="text-sm text-muted hover:text-fg-2"
      >
        &larr; Back to Accounts
      </Link>

      {/* Account Header */}
      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted uppercase tracking-wide capitalize">
              {account.type?.replace("_", " ").toLowerCase()}
            </p>
            <h1 className="text-[28px] font-semibold tracking-tight text-fg mt-1">
              {account.name}
            </h1>
            {account.notes && (
              <p className="text-sm text-muted mt-2">{account.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">Balance</p>
            <p
              className={`text-3xl font-bold ${
                (account.balance ?? 0) >= 0
                  ? "text-pos"
                  : "text-neg"
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
          <h2 className="text-lg font-semibold text-fg mb-3">
            Category Balances
          </h2>
          <div className="bg-surface border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Category
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryBalances.map((c) => (
                  <tr
                    key={c.id ?? c.name}
                    className="border-b border-line last:border-0"
                  >
                    <td className="px-4 py-3 text-fg font-medium">
                      {c.name}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        c.balance >= 0 ? "text-pos" : "text-neg"
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
        <h2 className="text-lg font-semibold text-fg mb-3">
          Transactions
        </h2>
        {transactions.length === 0 ? (
          <div className="bg-surface border border-line rounded-2xl p-6 text-center text-muted">
            No transactions for this account.
          </div>
        ) : (
          <div className="bg-surface border border-line rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Date
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Description
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Type
                  </th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">
                    Amount
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Category
                  </th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t: any) => (
                  <tr
                    key={t.id}
                    className="border-b border-line last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3 text-fg-2">
                      {t.date?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-fg font-medium">
                      {t.description}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={t.type} />
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium ${
                        t.type === "INCOME"
                          ? "text-pos"
                          : t.type === "SPENDING"
                          ? "text-neg"
                          : "text-muted"
                      }`}
                    >
                      {/* Signed from this account's point of view: money in +, money out − (transfers too). */}
                      {t.toAccountId === id ? "+" : "−"}
                      {fmt(t.amount ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-muted">
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
