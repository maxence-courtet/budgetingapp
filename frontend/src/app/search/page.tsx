"use client";

import { useEffect, useState } from "react";
import {
  searchTransactions,
  getAccounts,
  getCategories,
} from "@/lib/api";

const fmt = (n: number) =>
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TYPE_COLORS: Record<string, string> = {
  INCOME: "bg-green-100 text-green-700",
  SPENDING: "bg-red-100 text-red-700",
  TRANSFER: "bg-blue-100 text-blue-700",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  SKIPPED: "bg-slate-200 text-slate-400",
};

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

export default function SearchPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

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
      .catch(console.error);
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string> = {};
      if (description.trim()) params.query = description.trim();
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
    } catch (e) {
      console.error(e);
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
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        Search Transactions
      </h1>

      <form onSubmit={handleSearch}>
        {/* Search bar */}
        <div className="mb-4">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Search by description..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* Filter row */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">All</option>
                <option value="INCOME">INCOME</option>
                <option value="SPENDING">SPENDING</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">All</option>
                <option value="PLANNED">PLANNED</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="SKIPPED">SKIPPED</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Amount Min
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Amount Max
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <p className="text-slate-500 py-8 text-center">Searching...</p>
      ) : searched ? (
        <div>
          <p className="text-sm text-slate-500 mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>

          {results.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
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
                        Account(s)
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">
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
                          ? "text-green-600"
                          : tx.type === "SPENDING"
                          ? "text-red-600"
                          : "text-blue-600";

                      return (
                        <tr
                          key={tx.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 py-3 text-slate-900">
                            {tx.description || "-"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                TYPE_COLORS[tx.type] || ""
                              }`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono ${amountColor}`}
                          >
                            {amountPrefix}
                            {fmt(tx.amount)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {tx.category?.name ?? "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {accountStr}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                STATUS_COLORS[tx.status] || ""
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {tx.month
                              ? `${MONTH_NAMES[tx.month.month - 1]} ${tx.month.year}`
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-500">
                No transactions match your search criteria.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
