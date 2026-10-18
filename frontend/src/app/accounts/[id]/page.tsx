"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getAccount, getTransactions, getCategories } from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { TRANSACTIONS_CHANGED, openQuickAdd } from "@/components/QuickAddTransaction";

const PAGE_SIZE = 50;
const CATEGORY_PREVIEW = 5;

function signed(n: number) {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(n)}`;
}

export default function AccountDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [allCategories, setAllCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [acct, txns, cats] = await Promise.all([
        getAccount(id),
        getTransactions({ accountId: id }),
        getCategories().catch(() => []),
      ]);
      setAccount(acct);
      setTransactions(Array.isArray(txns) ? txns : txns.data ?? []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Reload after a transaction is edited or deleted in the transaction sheet.
    window.addEventListener(TRANSACTIONS_CHANGED, load);
    return () => window.removeEventListener(TRANSACTIONS_CHANGED, load);
  }, [load]);

  if (loading) {
    return <LoadingState message="Loading account..." />;
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <PageHeader title="Account" back={{ href: "/accounts", label: "Accounts" }} />
        {error && <ErrorBanner message={error} />}
        <div className="bg-surface-2 border border-line text-muted rounded-xl p-4">
          Account not found. <Link href="/accounts" className="text-accent font-medium">Back to accounts</Link>
        </div>
      </div>
    );
  }

  // Per-category balances come from the API: PAID transactions up to today, signed for this account.
  const categoryBalances: { id: string; name: string; balance: number }[] = account.categoryBalances ?? [];
  // Largest balances first; the rest stay folded so the transactions aren't pushed far down on phones.
  const sortedBalances = [...categoryBalances].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
  const visibleBalances = allCategories ? sortedBalances : sortedBalances.slice(0, CATEGORY_PREVIEW);
  const balance = account.balance ?? 0;
  const years = new Set(transactions.map((t) => new Date(t.date).getUTCFullYear()));
  const visible = transactions.slice(0, shown);

  return (
    <div>
      <PageHeader title={account.name} back={{ href: "/accounts", label: "Accounts" }} />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        {/* Balance first, with what it is made of right under it. */}
        <div className="space-y-4 mb-6 lg:mb-0 lg:order-2 lg:sticky lg:top-6">
          <section aria-label="Balance" className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              {String(account.type ?? "").replace(/_/g, " ").toLowerCase()} · balance
            </p>
            <p
              className={`mt-2 font-mono text-[34px] sm:text-[40px] font-medium tracking-[-0.03em] leading-none ${
                balance >= 0 ? "text-fg" : "text-neg"
              }`}
            >
              {balance < 0 ? "−" : ""}
              {fmt(balance)}
            </p>
            <p className="mt-2 text-xs text-muted">
              {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
            </p>
            {account.notes && <p className="mt-3 text-sm text-fg-2">{account.notes}</p>}
          </section>

          {categoryBalances.length > 0 && (
            <section aria-labelledby="cat-balances" className="bg-surface border border-line rounded-2xl overflow-hidden">
              <h2
                id="cat-balances"
                className="px-4 pt-4 pb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted"
              >
                By category
              </h2>
              <ul role="list" className="divide-y divide-line">
                {visibleBalances.map((c) => (
                  <li key={c.id ?? c.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-sm text-fg truncate">{c.name}</span>
                    <span
                      className={`shrink-0 font-mono text-sm font-medium ${
                        c.balance > 0 ? "text-pos" : c.balance < 0 ? "text-neg" : "text-muted"
                      }`}
                    >
                      {signed(c.balance)}
                    </span>
                  </li>
                ))}
              </ul>
              {categoryBalances.length > CATEGORY_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setAllCategories((v) => !v)}
                  aria-expanded={allCategories}
                  className="w-full border-t border-line px-4 py-2.5 text-sm font-medium text-accent hover:bg-surface-2 transition-colors"
                >
                  {allCategories ? "Show fewer" : `Show all ${categoryBalances.length}`}
                </button>
              )}
            </section>
          )}
        </div>

        <section aria-labelledby="acct-tx" className="lg:order-1 min-w-0">
          <h2 id="acct-tx" className="text-base font-semibold text-fg mb-3">
            Transactions
          </h2>
          {transactions.length === 0 ? (
            <div className="bg-surface border border-line rounded-2xl px-5 py-10 text-center text-sm text-muted">
              No transactions for this account.
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <TransactionList
                transactions={visible}
                categories={categories}
                onSelect={(tx) => openQuickAdd(tx)}
                showYear={years.size > 1}
              />
              {transactions.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE_SIZE)}
                  className="w-full border-t border-line px-4 py-3 text-sm font-medium text-accent hover:bg-surface-2 transition-colors"
                >
                  Show more ({transactions.length - shown} older)
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
