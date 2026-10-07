"use client";

import { localISO } from "@/lib/date";
import { useState, useEffect, useCallback } from "react";
import {
  getFitnessEntries,
  createFitnessEntry,
  updateFitnessEntry,
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
import { Check, Pencil, Plus, Trash2 } from "lucide-react";

type MetricTab = "WEIGHT" | "BODY_FAT" | "STEPS" | "WORKOUT_DURATION" | "OTHER";

/** Unit to suggest when the metric type changes. */
const DEFAULT_UNITS: Record<string, string> = { WEIGHT: "kg", BODY_FAT: "%", STEPS: "steps", WORKOUT_DURATION: "min" };

const MAIN_TYPES: MetricTab[] = ["WEIGHT", "BODY_FAT", "STEPS", "WORKOUT_DURATION"];

const TAB_LABELS: Record<MetricTab, string> = {
  WEIGHT: "Weight",
  BODY_FAT: "Body Fat",
  STEPS: "Steps",
  WORKOUT_DURATION: "Workout Duration",
  OTHER: "Other",
};

const SHORT_LABELS: Record<MetricTab, string> = { ...TAB_LABELS, WORKOUT_DURATION: "Workout" };

function labelFor(type: string): string {
  return (TAB_LABELS as Record<string, string>)[type] ?? type;
}

const TYPE_SUGGESTIONS = ["WEIGHT", "BODY_FAT", "STEPS", "WORKOUT_DURATION"];

function todayISO(): string {
  return localISO();
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

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const [rejectConfirm, setRejectConfirm] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; value: string; unit: string; date: string; note: string } | null>(null);
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
    setError("");
    setFormType("WEIGHT");
    setFormValue("");
    setFormUnit("kg");
    setFormDate(todayISO());
    setFormNote("");
    setShowLog(false);
  };

  const handleCreate = async () => {
    if (!formType.trim()) return setError("Pick or type a metric.");
    if (formValue === "" || Number.isNaN(parseFloat(formValue))) return setError("Enter a value.");
    if (parseFloat(formValue) < 0) return setError("Values can't be negative.");
    if (!formDate) return setError("Pick a date.");
    const builtIn = isMainType(formType.trim().toUpperCase());
    if (!formUnit.trim() && !builtIn) return setError("A custom metric needs a unit.");
    setSaving(true);
    try {
      // Built-in metrics are stored as their code (WEIGHT…); a custom one keeps the user's spelling.
      const type = builtIn ? formType.trim().toUpperCase() : formType.trim();
      await createFitnessEntry({
        type,
        value: parseFloat(formValue),
        unit: formUnit.trim() || undefined,
        date: formDate,
        note: formNote.trim() || undefined,
      });
      resetForm();
      // Show the tab the new entry landed in.
      setActiveTab(builtIn ? (type as MetricTab) : "OTHER");
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const patchEdit = (patch: Partial<{ value: string; unit: string; date: string; note: string }>) =>
    setEditing((cur) => (cur ? { ...cur, ...patch } : cur));

  const handleSaveEdit = async () => {
    if (!editing) return;
    const value = parseFloat(editing.value);
    if (Number.isNaN(value) || value < 0) return setError("Enter a value of 0 or more.");
    if (!editing.date) return setError("Pick a date.");
    try {
      await updateFitnessEntry(editing.id, {
        value,
        unit: editing.unit.trim() || undefined,
        date: editing.date,
        note: editing.note.trim() || null,
      });
      setEditing(null);
      setError("");
      await loadData();
    } catch (e: any) {
      setError(e.message);
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
      setRejectConfirm(null);
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

  // Latest (and previous, for the change) value per main metric type
  const latestByType: Record<string, any> = {};
  const previousByType: Record<string, any> = {};
  for (const t of MAIN_TYPES) {
    const sorted = entries
      .filter((e) => e.type === t && e.validatedAt)
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (b.e.date ?? "").localeCompare(a.e.date ?? "") || a.i - b.i)
      .map(({ e }) => e);
    if (sorted[0]) latestByType[t] = sorted[0];
    if (sorted[1]) previousByType[t] = sorted[1];
  }

  if (loading) return <LoadingState message="Loading fitness data..." />;

  const openLog = () => { resetForm(); setShowLog(true); };
  const inputCls =
    "w-full border border-line-strong rounded-xl px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-accent";
  const sortedEntries = filteredEntries
    .slice()
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Fitness"
        action={
          !showLog ? (
            <button
              onClick={openLog}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" /> Log entry
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Latest value per metric */}
      {Object.keys(latestByType).length > 0 && (
        <section aria-label="Latest values" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {MAIN_TYPES.filter((t) => latestByType[t]).map((t) => {
            const entry = latestByType[t];
            const prev = previousByType[t];
            const delta = prev ? entry.value - prev.value : null;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTab(t)}
                aria-pressed={activeTab === t}
                className={`text-left bg-surface border rounded-2xl p-4 sm:p-5 transition-colors hover:border-line-strong ${
                  activeTab === t ? "border-line-strong" : "border-line"
                }`}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{SHORT_LABELS[t]}</p>
                <p className="mt-1 text-[22px] sm:text-2xl font-semibold text-fg tabular-nums leading-tight">
                  {formatNumber(entry.value)}
                  <span className="text-sm font-normal text-muted ml-1">{entry.unit}</span>
                </p>
                <p className="mt-1 text-xs text-faint">
                  {formatShortDate(entry.date)}
                  {delta !== null && delta !== 0 && (
                    <span className="ml-1.5 text-muted tabular-nums">
                      {delta > 0 ? "▲" : "▼"} {formatNumber(Math.abs(delta))}
                    </span>
                  )}
                </p>
              </button>
            );
          })}
        </section>
      )}

      {/* Log form */}
      {showLog && (
        <section aria-labelledby="log-heading" className="bg-surface border border-line rounded-2xl p-4 sm:p-6">
          <h2 id="log-heading" className="text-lg font-semibold text-fg mb-4">Log an entry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fitness-type" className="block text-sm font-medium text-fg-2 mb-1">
                Metric
              </label>
              <input
                id="fitness-type"
                type="text"
                list="fitness-type-suggestions"
                value={formType}
                onChange={(e) => {
                  setFormType(e.target.value);
                  // Built-in metrics suggest their unit (kg, %, steps, min) unless you typed your own;
                  // switching to a custom metric clears a suggested unit.
                  const suggested = Object.values(DEFAULT_UNITS);
                  const unit = DEFAULT_UNITS[e.target.value.trim().toUpperCase()];
                  const untouched = !formUnit.trim() || suggested.includes(formUnit.trim());
                  if (untouched) setFormUnit(unit ?? "");
                }}
                placeholder="e.g. WEIGHT"
                className={inputCls}
              />
              <datalist id="fitness-type-suggestions">
                {TYPE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="fitness-date" className="block text-sm font-medium text-fg-2 mb-1">
                Date
              </label>
              <input
                id="fitness-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-[1fr_7rem] gap-3 sm:col-span-2 sm:grid-cols-2 sm:gap-4">
              <div>
                <label htmlFor="fitness-value" className="block text-sm font-medium text-fg-2 mb-1">
                  Value
                </label>
                <input
                  id="fitness-value"
                  type="number"
                  inputMode="decimal"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder="0"
                  step="any"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="fitness-unit" className="block text-sm font-medium text-fg-2 mb-1">
                  Unit
                </label>
                <input
                  id="fitness-unit"
                  type="text"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  placeholder="kg, %, min…"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fitness-note" className="block text-sm font-medium text-fg-2 mb-1">
                Note
              </label>
              <textarea
                id="fitness-note"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                rows={2}
                placeholder="Optional note"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={saving || !formType.trim() || !formValue}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Log entry"}
            </button>
            <button
              onClick={resetForm}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Entries added by the AI assistant, waiting for review */}
      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="bg-yellow-50 border border-yellow-200 rounded-2xl overflow-hidden">
          <h2 id="pending-heading" className="px-4 pt-3.5 pb-2 text-sm font-medium text-yellow-800">
            {pending.length} {pending.length === 1 ? "entry" : "entries"} added by AI — review and approve
          </h2>
          <ul role="list" className="px-3 pb-3 space-y-2">
            {pending.map((entry: any) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-surface border border-yellow-100 rounded-xl px-3 py-2.5"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-sm text-fg">
                    <span className="font-medium">{labelFor(entry.type)}</span>
                    <span className="mx-1.5 text-faint">·</span>
                    <span className="tabular-nums">{formatNumber(entry.value)} {entry.unit}</span>
                  </p>
                  <p className="text-xs text-muted truncate">
                    {formatDate(entry.date)}
                    {entry.note && <> · <span className="italic">{entry.note}</span></>}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {rejectConfirm === entry.id ? (
                    <ConfirmDelete
                      label="Reject and delete?"
                      onConfirm={() => handleReject(entry.id)}
                      onCancel={() => setRejectConfirm(null)}
                    />
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(entry.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
                      >
                        <Check size={14} aria-hidden="true" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectConfirm(entry.id)}
                        className="px-3 py-1.5 text-sm font-medium border border-red-300 text-neg rounded-xl hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* History */}
      <section aria-labelledby="history-heading" className="space-y-3">
        <h2 id="history-heading" className="sr-only">History</h2>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="Metric" className="inline-flex p-1 rounded-xl bg-surface-2">
            {(["WEIGHT", "BODY_FAT", "STEPS", "WORKOUT_DURATION", "OTHER"] as MetricTab[]).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
                }`}
              >
                {SHORT_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {sortedEntries.length === 0 ? (
          <EmptyState
            message={`No ${TAB_LABELS[activeTab].toLowerCase()} entries yet.`}
            cta={{ label: "Log an entry", onClick: openLog }}
          />
        ) : (
          <ul
            role="list"
            aria-label={`${TAB_LABELS[activeTab]} entries`}
            className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden"
          >
            {sortedEntries.map((entry: any) => {
              if (editing && editing.id === entry.id) {
                const ed = editing;
                return (
                  <li key={entry.id} className="p-4 bg-surface-2">
                    <p className="text-sm font-medium text-fg mb-3">Edit {labelFor(entry.type).toLowerCase()} entry</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-muted mb-1" htmlFor={`edit-date-${entry.id}`}>Date</label>
                        <input id={`edit-date-${entry.id}`} type="date" value={ed.date} onChange={(e) => patchEdit({ date: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1" htmlFor={`edit-value-${entry.id}`}>Value</label>
                        <input id={`edit-value-${entry.id}`} type="number" inputMode="decimal" step="any" min="0" value={ed.value} onChange={(e) => patchEdit({ value: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1" htmlFor={`edit-unit-${entry.id}`}>Unit</label>
                        <input id={`edit-unit-${entry.id}`} type="text" value={ed.unit} onChange={(e) => patchEdit({ unit: e.target.value })} className={inputCls} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-muted mb-1" htmlFor={`edit-note-${entry.id}`}>Note</label>
                        <input id={`edit-note-${entry.id}`} type="text" value={ed.note} onChange={(e) => patchEdit({ note: e.target.value })} placeholder="Optional" className={inputCls} />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button onClick={handleSaveEdit} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover">Save</button>
                      <button onClick={() => setEditing(null)} className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface">Cancel</button>
                    </div>
                  </li>
                );
              }
              const isPending = entry.source === "MCP" && !entry.validatedAt;
              return (
                <li key={entry.id} className="flex items-center gap-3 pl-4 pr-2 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-fg tabular-nums">
                      {formatNumber(entry.value)}
                      <span className="ml-1 text-xs font-normal text-muted">{entry.unit}</span>
                      {activeTab === "OTHER" && (
                        <span className="ml-2 text-sm font-medium text-fg-2">{entry.type}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0">{formatDate(entry.date)}</span>
                      {entry.note && <span className="truncate">· {entry.note}</span>}
                    </p>
                  </div>
                  {isPending ? (
                    <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>
                  ) : entry.source === "MCP" ? (
                    <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-surface-2 text-muted" title="Added by AI">AI</span>
                  ) : null}
                  {deleteConfirm === entry.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(entry.id)}
                      onCancel={() => setDeleteConfirm(null)}
                      label="Delete?"
                    />
                  ) : (
                    <div className="flex shrink-0">
                      <button
                        onClick={() =>
                          setEditing({ id: entry.id, value: String(entry.value), unit: entry.unit ?? "", date: entry.date?.slice(0, 10) ?? "", note: entry.note ?? "" })
                        }
                        aria-label={`Edit entry from ${formatDate(entry.date)}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
                      >
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(entry.id)}
                        aria-label={`Delete entry from ${formatDate(entry.date)}`}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-neg hover:bg-surface-2"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
