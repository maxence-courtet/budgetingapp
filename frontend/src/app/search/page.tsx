"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import {
  searchTransactions,
  getAccounts,
  getCategories,
} from "@/lib/api";
import { fmt } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransactionList } from "@/components/TransactionList";
import { TRANSACTIONS_CHANGED, openQuickAdd } from "@/components/QuickAddTransaction";

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

const inputClass =
  "w-full h-10 px-3 border border-line-strong bg-surface rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent";
const labelClass = "block text-xs font-medium text-muted mb-1";

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<LoadingState message="Loading search..." />}>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [total, setTotal] = useState(0);
  const urlQuery = searchParams.get("query") ?? "";
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Phones only (filters are always shown from sm up). Arriving without a query means the
  // person came for the filters, so start with them open.
  const [filtersOpen, setFiltersOpen] = useState(!urlQuery);
  // The params of the last search run, so edits in the transaction sheet can refresh the same results.
  const lastParams = useRef<Record<string, string> | null>(null);

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

  const activeFilters = [accountId, categoryId, type, status, dateFrom, dateTo, amountMin, amountMax].filter(
    Boolean
  ).length;

  useEffect(() => {
    Promise.all([getAccounts(), getCategories()])
      .then(([a, c]) => {
        setAccounts(a);
        setCategories(c);
      })
      .catch((e: any) => setError(e.message));
  }, []);

  const runSearch = async (params: Record<string, string>, quiet = false) => {
    lastParams.current = params;
    if (!quiet) setLoading(true);
    setSearched(true);
    try {
      const data = await searchTransactions(params);
      const rows = Array.isArray(data) ? data : data.transactions ?? [];
      setResults(rows);
      setTotal(Array.isArray(data) ? rows.length : data.total ?? rows.length);
    } catch (e: any) {
      setError(e.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // A query from the command bar (/search?query=…) runs immediately.
  useEffect(() => {
    if (urlQuery) {
      setDescription(urlQuery);
      handleSearch(undefined, urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  // Reload the results after a transaction is edited or deleted in the transaction sheet.
  useEffect(() => {
    const reload = () => {
      if (lastParams.current) runSearch(lastParams.current, true);
    };
    window.addEventListener(TRANSACTIONS_CHANGED, reload);
    return () => window.removeEventListener(TRANSACTIONS_CHANGED, reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e?: React.FormEvent, queryOverride?: string) => {
    e?.preventDefault();
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
    // On phones, fold the filters away so the results are what's on screen.
    if (e) setFiltersOpen(false);
    await runSearch(params);
  };

  const handleClear = () => {
    // Drop ?query= too, so a reload doesn't bring the old search back.
    if (urlQuery) router.replace("/search");
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
    lastParams.current = null;
  };

  const income = results.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const spending = results.filter((t) => t.type === "SPENDING").reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <PageHeader title="Search" back={{ href: "/months", label: "Transactions" }} />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      <form onSubmit={handleSearch} role="search" className="mb-5 sm:mb-6">
        <div className="flex gap-2">
          <label className="flex-1 min-w-0 flex items-center gap-3 h-11 px-4 rounded-xl border border-line-strong bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
            <Search size={17} className="text-muted shrink-0" aria-hidden="true" />
            <span className="sr-only">Search by description</span>
            <input
              id="search-description"
              type="search"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Search by description"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-11 px-4 shrink-0 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
          >
            Search
          </button>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          aria-controls="search-filters"
          className="sm:hidden mt-3 flex items-center gap-2 h-9 px-3 -ml-1 rounded-lg text-sm font-medium text-fg-2 hover:bg-surface-2"
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          Filters
          {activeFilters > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-ink text-[11px] font-semibold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={`text-muted transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div
          id="search-filters"
          className={`${filtersOpen ? "block" : "hidden"} sm:block mt-3 bg-surface rounded-2xl border border-line p-4`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor="f-account" className={labelClass}>
                Account
              </label>
              <select id="f-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
                <option value="">All</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-category" className={labelClass}>
                Category
              </label>
              <select id="f-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-type" className={labelClass}>
                Type
              </label>
              <select id="f-type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                <option value="">All</option>
                <option value="INCOME">Income</option>
                <option value="SPENDING">Spending</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-status" className={labelClass}>
                Status
              </label>
              <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="">All</option>
                <option value="PLANNED">Planned</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="SKIPPED">Skipped</option>
              </select>
            </div>

            <div>
              <label htmlFor="f-from" className={labelClass}>
                From
              </label>
              <input id="f-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label htmlFor="f-to" className={labelClass}>
                To
              </label>
              <input id="f-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label htmlFor="f-min" className={labelClass}>
                Min amount
              </label>
              <input
                id="f-min"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="f-max" className={labelClass}>
                Max amount
              </label>
              <input
                id="f-max"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="flex-1 sm:flex-none px-4 py-2 bg-accent text-accent-ink text-sm font-medium rounded-xl hover:bg-accent-hover transition-colors"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-sm font-medium text-muted bg-surface-2 rounded-xl hover:bg-line transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <LoadingState message="Searching..." />
      ) : searched ? (
        <section aria-labelledby="results-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 mb-2">
            <h2 id="results-heading" className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </h2>
            {results.length > 0 && (
              <p className="text-xs font-mono text-muted">
                {income > 0 && <span className="text-pos">in +{fmt(income)}</span>}
                {income > 0 && spending > 0 && <span className="mx-1.5 text-faint">·</span>}
                {spending > 0 && <span>out −{fmt(spending)}</span>}
              </p>
            )}
          </div>
          {total > results.length && (
            <p className="px-1 mb-2 text-xs text-muted">
              Showing the {results.length} most recent of {total}. Narrow the filters to see the rest.
            </p>
          )}

          {results.length > 0 ? (
            <div className="bg-surface rounded-2xl border border-line overflow-hidden">
              <TransactionList
                transactions={results}
                categories={categories}
                onSelect={(tx) => openQuickAdd(tx)}
                showYear
              />
            </div>
          ) : (
            <div className="bg-surface rounded-2xl border border-line p-6 text-center">
              <p className="text-muted">No transactions match your search.</p>
            </div>
          )}
        </section>
      ) : (
        <p className="px-1 text-sm text-muted">
          Search by description, or pick filters and apply them.
        </p>
      )}
    </div>
  );
}
