"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Trash2 } from "lucide-react";
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/api";
import { addDays, todayISO } from "@/lib/habitStats";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

interface Entry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  entryDate: string | null;
  createdAt: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AUTOSAVE_MS = 1000;

const dayOf = (e: Entry) => (e.entryDate ?? e.createdAt).slice(0, 10);

function longDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(Date.UTC(year, month, d)).toISOString().slice(0, 10));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function Journal() {
  const today = todayISO();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const entriesRef = useRef<Entry[]>([]);
  const creating = useRef(new Map<string, Promise<Entry>>());
  entriesRef.current = entries;

  useEffect(() => {
    getNotes({ noteType: "JOURNAL", limit: "2000" })
      .then((data) => setEntries(data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byDay = useMemo(() => new Map(entries.map((e) => [dayOf(e), e])), [entries]);
  const current = byDay.get(selected);

  // Load the selected day's text into the editor.
  useEffect(() => {
    setDraft(current?.content ?? "");
    setStatus("idle");
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, loading]);

  const streak = useMemo(() => {
    let n = 0;
    for (let d = byDay.has(today) ? today : addDays(today, -1); byDay.has(d); d = addDays(d, -1)) n++;
    return n;
  }, [byDay, today]);
  const monthPrefix = `${view.y}-${String(view.m + 1).padStart(2, "0")}`;
  const monthCount = [...byDay.keys()].filter((d) => d.startsWith(monthPrefix)).length;

  async function save(day: string, text: string) {
    const content = text.trim();
    if (!content) return;
    setStatus("saving");
    try {
      // A create for this day may still be in flight: wait for it, then update.
      const pending = creating.current.get(day);
      if (pending) await pending.catch(() => null);
      const existing = entriesRef.current.find((e) => dayOf(e) === day);
      if (existing) {
        const updated = await updateNote(existing.id, { content });
        setEntries((es) => es.map((e) => (e.id === existing.id ? { ...e, ...updated } : e)));
      } else {
        const request: Promise<Entry> = createNote({
          title: longDate(day),
          content,
          tags: [],
          noteType: "JOURNAL",
          entryDate: day,
        });
        creating.current.set(day, request);
        const created = await request.finally(() => creating.current.delete(day));
        entriesRef.current = [...entriesRef.current, created];
        setEntries((es) => [...es, created]);
      }
      setStatus("saved");
    } catch (e: any) {
      setError(e.message);
      setStatus("idle");
    }
  }

  function onType(text: string) {
    setDraft(text);
    setStatus("idle");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const day = selected;
    saveTimer.current = window.setTimeout(() => save(day, text), AUTOSAVE_MS);
  }

  function select(day: string) {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
      if (draft.trim() && draft !== (current?.content ?? "")) save(selected, draft);
    }
    setSelected(day);
  }

  async function remove() {
    if (!current) return;
    try {
      await deleteNote(current.id);
      setEntries((es) => es.filter((e) => e.id !== current.id));
      setDraft("");
      setConfirmDelete(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function shiftMonth(delta: number) {
    setView(({ y, m }) => {
      const d = new Date(Date.UTC(y, m + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    });
  }

  const cells = monthGrid(view.y, view.m);
  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}
      <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 items-start">
        <aside className="space-y-3">
          <section aria-label="Calendar" className="bg-surface border border-line rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2">
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <h2 className="text-sm font-semibold text-fg">{monthLabel}</h2>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2">
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1" role="grid" aria-label={monthLabel}>
              {WEEKDAYS.map((d) => (
                <span key={d} role="columnheader" className="text-center font-mono text-[10px] text-faint uppercase pb-1">{d.slice(0, 2)}</span>
              ))}
              {cells.map((day, i) =>
                day ? (
                  <button
                    key={day}
                    type="button"
                    role="gridcell"
                    onClick={() => select(day)}
                    disabled={day > today}
                    aria-selected={day === selected}
                    aria-label={`${longDate(day)}${byDay.has(day) ? ", has entry" : ""}`}
                    className={`relative h-9 rounded-lg text-sm font-mono transition-colors disabled:text-faint disabled:opacity-40 ${
                      day === selected
                        ? "bg-accent text-accent-ink"
                        : byDay.has(day)
                        ? "bg-accent-soft text-accent-strong hover:ring-1 hover:ring-accent"
                        : "text-fg-2 hover:bg-surface-2"
                    } ${day === today && day !== selected ? "ring-1 ring-accent" : ""}`}
                  >
                    {Number(day.slice(8))}
                  </button>
                ) : (
                  <span key={`e${i}`} />
                )
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { select(today); setView({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }); }} className="h-8 px-3 text-xs font-medium rounded-lg border border-line-strong text-fg hover:border-accent hover:text-accent">
                Today
              </button>
            </div>
          </section>

          <section aria-label="Journal stats" className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-line rounded-2xl p-4">
              <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">Streak</p>
              <p className={`flex items-center gap-1 font-mono text-2xl ${streak >= 7 ? "text-accent" : "text-fg"}`}>
                <Flame size={18} aria-hidden="true" className={streak >= 7 ? "fill-current" : ""} />
                {streak}<span className="text-sm text-faint">d</span>
              </p>
            </div>
            <div className="bg-surface border border-line rounded-2xl p-4">
              <p className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">This month</p>
              <p className="font-mono text-2xl text-fg">{monthCount}<span className="text-sm text-faint"> entries</span></p>
            </div>
          </section>
        </aside>

        <section aria-labelledby="entry-heading" className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-3 min-h-[28rem]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="entry-heading" className="text-lg font-semibold tracking-tight text-fg">
              {selected === today ? "Today · " : ""}{longDate(selected)}
            </h2>
            <span className="font-mono text-xs text-muted" role="status">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : current ? `Last edited ${new Date((current as any).updatedAt ?? current.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
            </span>
          </div>
          <label htmlFor="journal-entry" className="sr-only">Journal entry for {longDate(selected)}</label>
          <textarea
            id="journal-entry"
            value={draft}
            onChange={(e) => onType(e.target.value)}
            onBlur={() => {
              if (saveTimer.current) {
                window.clearTimeout(saveTimer.current);
                saveTimer.current = null;
                save(selected, draft);
              }
            }}
            disabled={loading}
            placeholder={"How did the day go?\n\nWhat went well, what got in the way, and what's the one thing for tomorrow?"}
            className="flex-1 min-h-[22rem] w-full resize-y bg-transparent border-0 outline-none text-[15px] leading-relaxed text-fg"
          />
          {current && (
            <div className="flex justify-end pt-2 border-t border-line">
              {confirmDelete ? (
                <span className="flex items-center gap-2 text-xs text-muted">
                  Delete this entry?
                  <button type="button" onClick={remove} className="h-7 px-3 rounded-lg bg-red-600 text-accent-ink font-medium">Delete</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="h-7 px-3 rounded-lg border border-line-strong text-fg-2">Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs text-muted hover:text-neg">
                  <Trash2 size={13} aria-hidden="true" />
                  Delete entry
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
