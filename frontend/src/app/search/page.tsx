"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  searchTransactions,
  getAccounts,
  getCategories,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { MONTH_NAMES } from "@/lib/constants";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { TypeBadge } from "@/components/ui/TypeBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Category {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
}

interface SearchResult {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string | null;
  status: string;
  category: Category;
  toCategoryId: string | null;
  fromAccount: Account | null;
  toAccount: Account | null;
  month: { id: string; month: number; year: number };
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<LoadingState message="Loading search..." />}>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("query") ?? "";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  useEffect(() => {
    Promise.all([getAccounts(), getCategories()])
      .then(([a, c]) => {
        setAccounts(a);
        setCategories(c);
      })
      .catch((e: any) => setError(e.message));
  }, []);

  // A query from the command bar (/search?query=…) runs immediately.
  useEffect(() => {
    if (urlQuery) {
      setDescription(urlQuery);
      handleSearch(undefined, urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  const handleSearch = async (e?: React.FormEvent, queryOverride?: string) => {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string> = {};
      const query = (queryOverride ?? description).trim();
      if (query) params.query = query;
      if (accountId) params.accountId = accountId;
      if (categoryId) params.categoryId = categoryId;
      if (type) params.type = type;
      if (status) params.status = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (amountMin) params.amountMin = amountMin;
      if (amountMax) params.amountMax = amountMax;

      const data = await searchTransactions(params);
      setResults(Array.isArray(data) ? data : data.transactions ?? []);
    } catch (e: any) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDescription("");
    setAccountId("");
    setCategoryId("");
    setType("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setResults([]);
    setSearched(false);
  };

  return (
    <div>
      <h1 className="text-[28px] font-semibold tracking-tight text-fg mb-6">
        Search Transactions
      </h1>

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <form onSubmit={handleSearch}>
        {/* Search bar */}
        <div className="mb-4">
          <label htmlFor="search-description" className="sr-only">
            Search by description
          </label>
          <input
            id="search-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Search by description..."
            className="w-full px-4 py-3 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Filter row */}
        <div className="bg-surface rounded-2xl border border-line p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All</option>
                <option value="INCOME">INCOME</option>
                <option value="SPENDING">SPENDING</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">All</option>
                <option value="PLANNED">PLANNED</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="SKIPPED">SKIPPED</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Amount Min
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">
                Amount Max
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-line-strong rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-muted bg-surface-2 rounded-xl hover:bg-line transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <LoadingState message="Searching..." />
      ) : searched ? (
        <div>
          <p className="text-sm text-muted mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>

          {results.length > 0 ? (
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              <div className="overflow-x-auto">
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
                        Account(s)
                      </th>
                      <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                        Status
                      </th>
                      <th scope="col" className="text-left px-4 py-3 font-medium text-muted">
                        Month
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((tx) => {
                      const accountStr =
                        tx.type === "TRANSFER"
                          ? `${tx.fromAccount?.name ?? "-"} → ${tx.toAccount?.name ?? "-"}`
                          : tx.type === "SPENDING"
                          ? tx.fromAccount?.name ?? "-"
                          : tx.toAccount?.name ?? "-";

                      const amountPrefix =
                        tx.type === "INCOME"
                          ? "+"
                          : tx.type === "SPENDING"
                          ? "-"
                          : "";

                      const amountColor =
                        tx.type === "INCOME"
                          ? "text-pos"
                          : tx.type === "SPENDING"
                          ? "text-neg"
                          : "text-muted";

                      return (
                        <tr
                          key={tx.id}
                          className="border-b border-line hover:bg-surface-2"
                        >
                          <td className="px-4 py-3 text-muted whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-fg">
                            {tx.description || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <TypeBadge type={tx.type} />
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono ${amountColor}`}
                          >
                            {amountPrefix}
                            {fmt(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {tx.category?.name ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-muted whitespace-nowrap">
                            {accountStr}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="px-4 py-3 text-muted whitespace-nowrap">
                            {tx.month ? (
                              <Link
                                href={`/months/${tx.month.id}`}
                                className="text-accent hover:text-accent-hover transition-colors"
                              >
                                {MONTH_NAMES[tx.month.month - 1]} {tx.month.year}
                              </Link>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-line p-8 text-center">
              <p className="text-muted">
                No transactions match your search criteria.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
