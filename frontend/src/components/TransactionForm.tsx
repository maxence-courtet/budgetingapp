"use client";

import { useState, useEffect } from "react";

interface TransactionFormProps {
  accounts: any[];
  categories: any[];
  monthId: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  initial?: any;
}

const STATUSES = ["PLANNED", "PAID", "PENDING", "SKIPPED"];
const TYPES = ["INCOME", "SPENDING", "TRANSFER"];

export default function TransactionForm({
  accounts,
  categories,
  monthId,
  onSave,
  onCancel,
  initial,
}: TransactionFormProps) {
  const [type, setType] = useState(initial?.type ?? "SPENDING");
  const [amount, setAmount] = useState<string>(initial?.amount?.toString() ?? "");
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [toCategoryId, setToCategoryId] = useState(initial?.toCategoryId ?? "");
  const [fromAccountId, setFromAccountId] = useState(initial?.fromAccountId ?? "");
  const [toAccountId, setToAccountId] = useState(initial?.toAccountId ?? "");
  const [status, setStatus] = useState(initial?.status ?? "PLANNED");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fromAccountId && accounts.length > 0 && type !== "INCOME") {
      setFromAccountId(accounts[0].id);
    }
    if (!toAccountId && accounts.length > 0 && type !== "SPENDING") {
      setToAccountId(accounts[0].id);
    }
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [accounts, categories, type, fromAccountId, toAccountId, categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    const data: any = {
      type,
      amount: parsedAmount,
      date,
      description: description.trim(),
      categoryId,
      status,
      monthId,
    };

    if (type === "TRANSFER") {
      data.toCategoryId = toCategoryId || undefined;
    }
    if (type !== "INCOME") {
      data.fromAccountId = fromAccountId || undefined;
    }
    if (type !== "SPENDING") {
      data.toAccountId = toAccountId || undefined;
    }

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                type === t
                  ? t === "INCOME"
                    ? "bg-green-100 border-green-300 text-green-800"
                    : t === "SPENDING"
                    ? "bg-red-100 border-red-300 text-red-800"
                    : "bg-blue-100 border-blue-300 text-blue-800"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Transaction description"
        />
      </div>

      <div className={type === "TRANSFER" ? "grid grid-cols-2 gap-4" : ""}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Select category</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {type === "TRANSFER" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Category</label>
            <select
              value={toCategoryId}
              onChange={(e) => setToCategoryId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Same as category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {type !== "INCOME" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Account</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select account</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        {type !== "SPENDING" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Account</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Select account</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          {initial ? "Update Transaction" : "Create Transaction"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
