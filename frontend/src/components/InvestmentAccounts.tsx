"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Receipt, TrendingUp } from "lucide-react";
import { addInvestmentFee, createAccount } from "@/lib/api";
import { localISO } from "@/lib/date";
import { fmt } from "@/lib/format";

export interface InvestmentAccount {
  id: string;
  name: string;
  type: string;
  cash: number;
  holdingsValue: number;
  total: number;
  holdings: { ticker: string; quantity: number; currentValue: number }[];
}

const signed = (n: number) => (n < 0 ? "−" : "") + fmt(n);
const inputCls =
  "w-full h-10 border border-line-strong rounded-xl px-3 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent";

/** Investment accounts with their cash and holdings, and the actions that belong to an account. */
export function InvestmentAccounts({ accounts, onChange }: { accounts: InvestmentAccount[]; onChange: () => void }) {
  if (accounts.length === 0) return <NoInvestmentAccount onCreated={onChange} />;
  return (
    <section aria-labelledby="inv-accounts-h" className="space-y-3">
      <div>
        <h2 id="inv-accounts-h" className="text-base font-semibold text-fg">Accounts</h2>
        <p className="text-xs text-muted mt-0.5">
          Move money in with a transfer. A buy takes its price and fees from the account&apos;s cash; a sell puts the
          proceeds back.
        </p>
      </div>
      <ul role="list" className="grid gap-3 md:grid-cols-2">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} onChange={onChange} />
        ))}
      </ul>
    </section>
  );
}

function AccountCard({ account: a, onChange }: { account: InvestmentAccount; onChange: () => void }) {
  const [feeOpen, setFeeOpen] = useState(false);
  return (
    <li className="bg-surface border border-line rounded-2xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/accounts/${a.id}`} className="font-semibold text-fg hover:underline truncate block">
            {a.name}
          </Link>
          {a.type !== "investment" && (
            <p className="text-xs text-muted">
              Type: {a.type}. <Link href="/accounts" className="text-accent-text underline">Change it to Investment</Link>
            </p>
          )}
        </div>
        <p className="font-mono text-lg font-semibold text-fg shrink-0">{signed(a.total)}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dt className="text-xs text-muted">Investments</dt>
          <dd className="font-mono text-fg">{signed(a.holdingsValue)}</dd>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <dt className="text-xs text-muted">Cash</dt>
          <dd className={`font-mono ${a.cash < 0 ? "text-neg" : "text-fg"}`}>{signed(a.cash)}</dd>
        </div>
      </dl>
      {a.holdings.length > 0 && (
        <p className="mt-2 text-xs text-muted truncate">
          {a.holdings.map((h) => h.ticker).join(" · ")}
        </p>
      )}
      {a.cash < -0.005 && (
        <p className="mt-2 text-xs text-muted">
          Cash is below zero: add the transfer that paid for these buys (from your bank account to {a.name}).
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/investments/trades?account=${a.id}`}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl bg-accent text-accent-ink text-sm font-medium hover:bg-accent-hover"
        >
          <Plus size={15} aria-hidden="true" /> Add trade
        </Link>
        <button
          type="button"
          onClick={() => setFeeOpen((o) => !o)}
          aria-expanded={feeOpen}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl border border-line-strong text-sm font-medium text-fg hover:bg-surface-2"
        >
          <Receipt size={15} aria-hidden="true" /> Add fee
        </button>
      </div>
      {feeOpen && (
        <FeeForm
          accountId={a.id}
          onDone={() => {
            setFeeOpen(false);
            onChange();
          }}
        />
      )}
    </li>
  );
}

function FeeForm({ accountId, onDone }: { accountId: string; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localISO(new Date()));
  const [description, setDescription] = useState("Custody fee");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addInvestmentFee({ accountId, amount: parseFloat(amount), date, description: description.trim() || undefined });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 pt-4 border-t border-line grid gap-3 sm:grid-cols-3">
      <p className="sm:col-span-3 text-xs text-muted">
        For fees the account charges on its own (custody, management). It&apos;s taken from the account&apos;s cash and
        shows as spending under &ldquo;Investment fees&rdquo;. A trade&apos;s own fees go on the trade.
      </p>
      <div>
        <label htmlFor={`fee-amount-${accountId}`} className="block text-xs font-medium text-fg-2 mb-1">Amount</label>
        <input
          id={`fee-amount-${accountId}`}
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor={`fee-date-${accountId}`} className="block text-xs font-medium text-fg-2 mb-1">Date</label>
        <input id={`fee-date-${accountId}`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`fee-desc-${accountId}`} className="block text-xs font-medium text-fg-2 mb-1">Description</label>
        <input id={`fee-desc-${accountId}`} value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      </div>
      {error && <p role="alert" className="sm:col-span-3 text-sm text-neg">{error}</p>}
      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={saving || !(parseFloat(amount) > 0)}
          className="h-9 px-4 rounded-xl bg-accent text-accent-ink text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save fee"}
        </button>
      </div>
    </form>
  );
}

function NoInvestmentAccount({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("Brokerage");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createAccount({ name: name.trim(), type: "investment" });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="no-inv-h" className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
      <span className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center">
        <TrendingUp size={18} className="text-accent" aria-hidden="true" />
      </span>
      <h2 id="no-inv-h" className="mt-3 text-base font-semibold text-fg">Add an investment account</h2>
      <p className="mt-1 text-sm text-muted">
        Your broker or pension account. It shows here with its cash and investments, and you log its trades and fees on
        this page. Already have it in Hive? Set its type to Investment on the{" "}
        <Link href="/accounts" className="text-accent-text underline">Accounts page</Link>.
      </p>
      <form onSubmit={create} className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label htmlFor="inv-name" className="block text-xs font-medium text-fg-2 mb-1">Account name</label>
          <input id="inv-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="h-10 px-4 rounded-xl bg-accent text-accent-ink text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create investment account"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-neg">{error}</p>}
    </section>
  );
}
