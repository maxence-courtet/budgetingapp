"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { Journal } from "@/components/Journal";
import { ChevronLeft, NotebookPen, Pencil, Plus, StickyNote, Trash2 } from "lucide-react";

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

/** Comma-separated tags, trimmed, without empties or case-insensitive duplicates. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()));
}

function truncate(str: string, len: number): string {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len) + "…";
}

export type View = "notes" | "journal";

/** Notes and Journal tabs; `view` comes from ?view= (read by the server page). */
export function NotesClient({ view }: { view: View }) {
  const router = useRouter();

  function switchTo(v: View) {
    router.replace(v === "journal" ? "/notes?view=journal" : "/notes", { scroll: false });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div role="tablist" aria-label="Notes or journal" className="grid grid-cols-2 sm:inline-grid gap-1 p-1 rounded-xl bg-surface-2">
        {([
          { id: "notes", label: "Notes", icon: StickyNote },
          { id: "journal", label: "Journal", icon: NotebookPen },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => switchTo(id)}
            className={`flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-colors ${
              view === id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {view === "journal" ? (
        <div>
          <PageHeader title="Journal" />
          <Journal />
        </div>
      ) : (
        <NotesView />
      )}
    </div>
  );
}

function NotesView() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Selected note
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setError("");
    try {
      // Ask for regular notes only, so journal entries and reviews can't push them out of the result limit.
      const data = await getNotes({ noteType: "NOTE", limit: "500" });
      setNotes(data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // All unique tags across all notes
  // Tags are matched case-insensitively ("Finance" and "finance" are one chip).
  const tagMap = new Map<string, string>();
  notes.forEach((n) => (n.tags ?? []).forEach((t: string) => !tagMap.has(t.toLowerCase()) && tagMap.set(t.toLowerCase(), t)));
  const allTags = [...tagMap.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const filteredNotes = activeTag
    ? notes.filter((n) => (n.tags ?? []).some((t: string) => t.toLowerCase() === activeTag.toLowerCase()))
    : notes;

  // A note hidden by the tag filter isn't shown on the right either.
  const selectedNote = selectedId ? filteredNotes.find((n) => n.id === selectedId) : null;

  const resetCreateForm = () => {
    setFormTitle("");
    setFormTags("");
    setFormContent("");
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSaving(true);
    try {
      const created = await createNote({
        title: formTitle.trim(),
        content: formContent.trim(),
        tags: parseTags(formTags),
        noteType: "NOTE",
      });
      resetCreateForm();
      await loadNotes();
      if (created?.id) setSelectedId(created.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setEditTitle(note.title ?? "");
    setEditContent(note.content ?? "");
    setEditTags((note.tags ?? []).join(", "));
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSaving(true);
    try {
      await updateNote(id, {
        title: editTitle.trim(),
        content: editContent.trim(),
        tags: parseTags(editTags),
      });
      setEditingId(null);
      await loadNotes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id);
      setDeleteConfirm(null);
      if (selectedId === id) setSelectedId(null);
      await loadNotes();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <LoadingState message="Loading notes..." />;

  const openCreate = () => {
    resetCreateForm();
    setShowCreate(true);
    setSelectedId(null);
    window.scrollTo({ top: 0 });
  };

  // On phones the list and the reader/editor take turns; on wider screens they sit side by side.
  const detailOpen = showCreate || !!selectedNote;
  const closeDetail = () => {
    setSelectedId(null);
    setShowCreate(false);
    setEditingId(null);
    setDeleteConfirm(null);
  };
  const backButton = (
    <button
      type="button"
      onClick={closeDetail}
      className="md:hidden inline-flex items-center gap-1 -ml-1 mb-3 text-sm font-medium text-muted hover:text-fg"
    >
      <ChevronLeft size={16} aria-hidden="true" />
      All notes
    </button>
  );
  const input = "w-full h-10 border border-line-strong rounded-xl px-3 text-sm text-fg bg-surface focus:outline-none focus:ring-2 focus:ring-accent";
  const textarea = "w-full border border-line-strong rounded-xl px-3 py-2 text-sm text-fg bg-surface leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent";
  const label = "block text-xs font-medium text-muted mb-1";

  return (
    <div>
      <PageHeader
        title="Notes"
        action={
          !showCreate ? (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              <Plus size={16} aria-hidden="true" />
              New note
            </button>
          ) : undefined
        }
      />

      <div className="space-y-4 sm:space-y-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div
            role="group"
            aria-label="Filter by tag"
            className={`${detailOpen ? "max-md:hidden" : ""} flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap`}
          >
            {[null, ...allTags].map((tag) => (
              <button
                key={tag ?? "__all"}
                type="button"
                onClick={() => setActiveTag(tag === null || activeTag === tag ? null : tag)}
                aria-pressed={activeTag === tag}
                className={`shrink-0 h-8 px-3 text-xs font-medium rounded-full border transition-colors ${
                  activeTag === tag
                    ? "bg-accent text-accent-ink border-accent"
                    : "bg-surface text-muted border-line-strong hover:border-accent hover:text-accent"
                }`}
              >
                {tag ?? "All"}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 lg:gap-6 items-start">
          {/* Notes list */}
          <div className={detailOpen ? "max-md:hidden" : ""}>
            {filteredNotes.length === 0 ? (
              <EmptyState
                message={activeTag ? `No notes tagged "${activeTag}".` : "No notes yet."}
                cta={!activeTag ? { label: "Write your first note", onClick: openCreate } : undefined}
              />
            ) : (
              <ul className="bg-surface border border-line rounded-2xl divide-y divide-line overflow-hidden">
                {filteredNotes.map((note) => (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(note.id);
                        setShowCreate(false);
                        setEditingId(null);
                        setDeleteConfirm(null);
                        if (window.matchMedia("(max-width: 767px)").matches) window.scrollTo({ top: 0 });
                      }}
                      aria-current={selectedId === note.id ? "true" : undefined}
                      className={`relative w-full text-left px-4 py-3 transition-colors ${
                        selectedId === note.id ? "bg-accent-soft/60" : "hover:bg-surface-2"
                      }`}
                    >
                      {selectedId === note.id && <span className="absolute left-0 inset-y-0 w-[3px] bg-accent" aria-hidden="true" />}
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-fg text-sm truncate">{note.title}</span>
                        <span className="font-mono text-[11px] text-faint shrink-0">
                          {note.createdAt ? formatDate(note.createdAt) : ""}
                        </span>
                      </span>
                      <span className="block text-xs text-muted mt-0.5 truncate">{truncate(note.content ?? "", 90)}</span>
                      {(note.tags ?? []).length > 0 && (
                        <span className="flex flex-wrap gap-1 mt-1.5">
                          {(note.tags ?? []).map((tag: string, i: number) => (
                            <span
                              key={`${tag}-${i}`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Selected note or create form */}
          <div className={detailOpen ? "" : "max-md:hidden"}>
            {showCreate ? (
              <section aria-labelledby="new-note-heading" className="bg-surface border border-line rounded-2xl p-4 sm:p-6">
                {backButton}
                <h2 id="new-note-heading" className="text-base font-semibold text-fg mb-4">New note</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label htmlFor="note-title" className={label}>
                      Title <span className="text-neg">*</span>
                    </label>
                    <input
                      id="note-title"
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Note title"
                      className={input}
                    />
                  </div>
                  <div>
                    <label htmlFor="note-tags" className={label}>Tags (comma-separated)</label>
                    <input
                      id="note-tags"
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="e.g. health, ideas, work"
                      className={input}
                    />
                  </div>
                  <div>
                    <label htmlFor="note-content" className={label}>
                      Content <span className="text-neg">*</span>
                    </label>
                    <textarea
                      id="note-content"
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      rows={10}
                      placeholder="Write your note here..."
                      className={textarea}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleCreate}
                    disabled={saving || !formTitle.trim() || !formContent.trim()}
                    className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Create note"}
                  </button>
                  <button
                    onClick={resetCreateForm}
                    className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            ) : selectedNote ? (
              <article className="bg-surface border border-line rounded-2xl p-4 sm:p-6">
                {backButton}
                {editingId === selectedNote.id ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label htmlFor="edit-note-title" className={label}>Title</label>
                      <input
                        id="edit-note-title"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={input}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-note-tags" className={label}>Tags (comma-separated)</label>
                      <input
                        id="edit-note-tags"
                        type="text"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        className={input}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-note-content" className={label}>Content</label>
                      <textarea
                        id="edit-note-content"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={12}
                        className={textarea}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(selectedNote.id)}
                        disabled={saving || !editTitle.trim() || !editContent.trim()}
                        className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 sm:flex-none h-10 px-4 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-fg leading-snug break-words">
                          {selectedNote.title}
                        </h2>
                        <p className="font-mono text-[11px] text-faint mt-1">
                          {selectedNote.createdAt ? formatDate(selectedNote.createdAt) : ""}
                          {selectedNote.type && selectedNote.type !== "NOTE" && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-soft text-accent-strong">
                              {selectedNote.type}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 -mr-1.5 -mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirm(null);
                            startEdit(selectedNote);
                          }}
                          aria-label="Edit note"
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-faint hover:text-fg hover:bg-surface-2"
                        >
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(deleteConfirm === selectedNote.id ? null : selectedNote.id)}
                          aria-label="Delete note"
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-faint hover:text-neg hover:bg-surface-2"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {deleteConfirm === selectedNote.id && (
                      <div className="mb-3">
                        <ConfirmDelete
                          onConfirm={() => handleDelete(selectedNote.id)}
                          onCancel={() => setDeleteConfirm(null)}
                          label="Delete this note?"
                        />
                      </div>
                    )}

                    {(selectedNote.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(selectedNote.tags ?? []).map((tag: string, i: number) => (
                          <span
                            key={`${tag}-${i}`}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-soft text-accent-strong"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-fg-2 leading-relaxed whitespace-pre-wrap break-words text-[15px] sm:text-sm">
                      {selectedNote.content}
                    </p>
                  </>
                )}
              </article>
            ) : (
              <div className="bg-surface border border-dashed border-line-strong rounded-2xl p-8 text-center">
                <p className="text-faint text-sm">Select a note to read it</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
