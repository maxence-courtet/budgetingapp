"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getFitnessEntries,
  createFitnessEntry,
  deleteFitnessEntry,
  getPendingFitnessEntries,
  validateFitnessEntry,
} from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";

type MetricTab = "WEIGHT" | "BODY_FAT" | "STEPS" | "WORKOUT_DURATION" | "OTHER";

const MAIN_TYPES: MetricTab[] = ["WEIGHT", "BODY_FAT", "STEPS", "WORKOUT_DURATION"];

const TAB_LABELS: Record<MetricTab, string> = {
  WEIGHT: "Weight",
  BODY_FAT: "Body Fat",
  STEPS: "Steps",
  WORKOUT_DURATION: "Workout Duration",
  OTHER: "Other",
};

const TYPE_SUGGESTIONS = ["WEIGHT", "BODY_FAT", "STEPS", "WORKOUT_DURATION"];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function isMainType(t: string): boolean {
  return (MAIN_TYPES as string[]).includes(t);
}

export default function FitnessPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<MetricTab>("WEIGHT");

  // Log form
  const [showLog, setShowLog] = useState(false);
  const [formType, setFormType] = useState("WEIGHT");
  const [formValue, setFormValue] = useState("");
  const [formUnit, setFormUnit] = useState("kg");
  const [formDate, setFormDate] = useState(todayISO());
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [entriesData, pendingData] = await Promise.all([
        getFitnessEntries(),
        getPendingFitnessEntries(),
      ]);
      setEntries(entriesData ?? []);
      setPending(pendingData ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormType("WEIGHT");
    setFormValue("");
    setFormUnit("kg");
    setFormDate(todayISO());
    setFormNote("");
    setShowLog(false);
  };

  const handleCreate = async () => {
    if (!formType.trim() || !formValue) return;
    setSaving(true);
    try {
      await createFitnessEntry({
        type: formType.trim().toUpperCase(),
        value: parseFloat(formValue),
        unit: formUnit.trim() || undefined,
        date: formDate,
        note: formNote.trim() || undefined,
      });
      resetForm();
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFitnessEntry(id);
      setDeleteConfirm(null);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await validateFitnessEntry(id);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await deleteFitnessEntry(id);
      await loadData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Filter entries for the active tab
  const filteredEntries = entries.filter((e) => {
    if (activeTab === "OTHER") return !isMainType(e.type);
    return e.type === activeTab;
  });

  // Latest value per main metric type
  const latestByType = MAIN_TYPES.reduce<Record<string, any>>((acc, t) => {
    const typeEntries = entries.filter((e) => e.type === t);
    if (typeEntries.length > 0) {
      // Sort descending by date and take first
      const sorted = [...typeEntries].sort((a, b) =>
        (b.date ?? "").localeCompare(a.date ?? "")
      );
      acc[t] = sorted[0];
    }
    return acc;
  }, {});

  if (loading) return <LoadingState message="Loading fitness data..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fitness"
        action={
          !showLog ? (
            <button
              onClick={() => { resetForm(); setShowLog(true); }}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              + Log Entry
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Pending MCP banner */}
      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-yellow-800 mb-3">
            {pending.length} fitness {pending.length === 1 ? "entry" : "entries"} added by AI — review and approve
          </p>
          <div className="space-y-2">
            {pending.map((entry: any) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 bg-surface border border-yellow-100 rounded-xl px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-fg">
                    {entry.type}
                  </span>
                  <span className="mx-2 text-faint">·</span>
                  <span className="text-sm text-fg-2">
                    {formatNumber(entry.value)} {entry.unit}
                  </span>
                  <span className="mx-2 text-faint">·</span>
                  <span className="text-xs text-muted">{formatDate(entry.date)}</span>
                  {entry.note && (
                    <span className="ml-2 text-xs text-muted italic truncate">"{entry.note}"</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(entry.id)}
                    className="px-3 py-1 text-xs font-medium bg-green-600 text-accent-ink rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(entry.id)}
                    className="px-3 py-1 text-xs font-medium border border-red-300 text-neg rounded-xl hover:bg-red-50 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest metric summary cards */}
      {Object.keys(latestByType).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MAIN_TYPES.filter((t) => latestByType[t]).map((t) => {
            const entry = latestByType[t];
            return (
              <div key={t} className="bg-surface border border-line rounded-2xl p-5">
                <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
                  {TAB_LABELS[t]}
                </p>
                <p className="text-2xl font-bold text-fg">
                  {formatNumber(entry.value)}
                  <span className="text-sm font-normal text-muted ml-1">{entry.unit}</span>
                </p>
                <p className="text-xs text-faint mt-1">{formatDate(entry.date)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Log form */}
      {showLog && (
        <div className="bg-surface border border-line rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-fg mb-4">Log Fitness Entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fitness-type" className="block text-sm font-medium text-muted mb-1">
                Type
              </label>
              <input
                id="fitness-type"
                type="text"
                list="fitness-type-suggestions"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                placeholder="e.g. WEIGHT"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <datalist id="fitness-type-suggestions">
                {TYPE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="fitness-date" className="block text-sm font-medium text-muted mb-1">
                Date
              </label>
              <input
                id="fitness-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="fitness-value" className="block text-sm font-medium text-muted mb-1">
                Value
              </label>
              <input
                id="fitness-value"
                type="number"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="0"
                step="any"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div>
              <label htmlFor="fitness-unit" className="block text-sm font-medium text-muted mb-1">
                Unit
              </label>
              <input
                id="fitness-unit"
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="e.g. kg, lbs, %, steps, min"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fitness-note" className="block text-sm font-medium text-muted mb-1">
                Note
              </label>
              <textarea
                id="fitness-note"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={2}
                placeholder="Optional note"
                className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !formType.trim() || !formValue}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Log Entry"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 border-b border-line">
        {(["WEIGHT", "BODY_FAT", "STEPS", "WORKOUT_DURATION", "OTHER"] as MetricTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg-2"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Entries table */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          message={`No ${TAB_LABELS[activeTab].toLowerCase()} entries yet.`}
          cta={{ label: "Log an entry", onClick: () => { resetForm(); setShowLog(true); } }}
        />
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label={`${TAB_LABELS[activeTab]} entries`}>
              <thead>
                <tr className="bg-surface-2 border-b border-line">
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Date</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Value</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Note</th>
                  <th scope="col" className="text-left px-4 py-3 font-medium text-muted">Source</th>
                  <th scope="col" className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries
                  .slice()
                  .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
                  .map((entry: any) => (
                    <tr key={entry.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 text-fg-2">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 font-medium text-fg">
                        {formatNumber(entry.value)} <span className="text-muted font-normal text-xs">{entry.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-muted max-w-[200px] truncate">
                        {entry.note ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {entry.source === "MCP" && !entry.validatedAt ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                            Pending
                          </span>
                        ) : entry.source === "MCP" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-2 text-muted">
                            AI
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deleteConfirm === entry.id ? (
                          <ConfirmDelete
                            onConfirm={() => handleDelete(entry.id)}
                            onCancel={() => setDeleteConfirm(null)}
                            label="Delete entry?"
                          />
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(entry.id)}
                            className="px-3 py-1 text-xs font-medium border border-red-300 text-neg rounded-xl hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
