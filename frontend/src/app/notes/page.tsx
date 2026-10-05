"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getNotes, createNote, updateNote, deleteNote } from "@/lib/api";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import { PageHeader } from "@/components/ui/PageHeader";
import { Journal } from "@/components/Journal";
import { NotebookPen, StickyNote } from "lucide-react";

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

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function truncate(str: string, len: number): string {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len) + "…";
}

type View = "notes" | "journal";

export default function NotesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading notes..." />}>
      <NotesOrJournal />
    </Suspense>
  );
}

function NotesOrJournal() {
  const router = useRouter();
  const view: View = useSearchParams().get("view") === "journal" ? "journal" : "notes";

  function switchTo(v: View) {
    router.replace(v === "journal" ? "/notes?view=journal" : "/notes", { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Notes or journal" className="inline-flex gap-1 p-1 rounded-xl bg-surface-2">
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
            className={`flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition-colors ${
              view === id ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {view === "journal" ? (
        <div className="space-y-6">
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
      const data = await getNotes();
      setNotes((data ?? []).filter((n: any) => !n.noteType || n.noteType === "NOTE"));
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
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags ?? []))
  ).sort();

  const filteredNotes = activeTag
    ? notes.filter((n) => (n.tags ?? []).includes(activeTag))
    : notes;

  const selectedNote = selectedId ? notes.find((n) => n.id === selectedId) : null;

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        action={
          !showCreate ? (
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreate(true);
                setSelectedId(null);
              }}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover transition-colors"
            >
              + New Note
            </button>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError("")} />}

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTag(null)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              activeTag === null
                ? "bg-accent text-accent-ink border-accent"
                : "bg-surface text-muted border-line-strong hover:border-accent hover:text-accent"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-accent text-accent-ink border-accent"
                  : "bg-surface text-muted border-line-strong hover:border-accent hover:text-accent"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: notes list */}
        <div className="space-y-2">
          {filteredNotes.length === 0 ? (
            <EmptyState
              message={activeTag ? `No notes tagged "${activeTag}".` : "No notes yet."}
              cta={
                !activeTag
                  ? {
                      label: "Write your first note",
                      onClick: () => {
                        resetCreateForm();
                        setShowCreate(true);
                        setSelectedId(null);
                      },
                    }
                  : undefined
              }
            />
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => {
                  setSelectedId(note.id);
                  setShowCreate(false);
                  setEditingId(null);
                }}
                className={`w-full text-left bg-surface border rounded-xl p-4 transition-colors hover:bg-surface-2 ${
                  selectedId === note.id
                    ? "border-accent ring-1 ring-accent"
                    : "border-line"
                }`}
              >
                <p className="font-semibold text-fg text-sm truncate">{note.title}</p>
                <p className="text-xs text-muted mt-0.5 truncate">
                  {truncate(note.content ?? "", 60)}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-wrap gap-1">
                    {(note.tags ?? []).map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-2 text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-faint shrink-0 ml-2">
                    {note.createdAt ? formatDate(note.createdAt) : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: selected note detail or create form */}
        <div>
          {showCreate ? (
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-fg mb-4">New Note</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="note-title" className="block text-sm font-medium text-muted mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="note-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Note title"
                    className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="note-tags" className="block text-sm font-medium text-muted mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    id="note-tags"
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="e.g. health, ideas, work"
                    className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label htmlFor="note-content" className="block text-sm font-medium text-muted mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="note-content"
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    rows={10}
                    placeholder="Write your note here..."
                    className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreate}
                  disabled={saving || !formTitle.trim() || !formContent.trim()}
                  className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Create Note"}
                </button>
                <button
                  onClick={resetCreateForm}
                  className="px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : selectedNote ? (
            <div className="bg-surface border border-line rounded-2xl p-6">
              {editingId === selectedNote.id ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-note-title" className="block text-sm font-medium text-muted mb-1">
                      Title
                    </label>
                    <input
                      id="edit-note-title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-note-tags" className="block text-sm font-medium text-muted mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      id="edit-note-tags"
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-note-content" className="block text-sm font-medium text-muted mb-1">
                      Content
                    </label>
                    <textarea
                      id="edit-note-content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={12}
                      className="w-full border border-line-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdate(selectedNote.id)}
                      disabled={saving || !editTitle.trim() || !editContent.trim()}
                      className="px-4 py-2 text-sm font-medium bg-accent text-accent-ink rounded-xl hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-fg leading-snug">
                        {selectedNote.title}
                      </h2>
                      <p className="text-xs text-faint mt-1">
                        {selectedNote.createdAt ? formatDate(selectedNote.createdAt) : ""}
                        {selectedNote.type && selectedNote.type !== "NOTE" && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-soft text-accent-strong">
                            {selectedNote.type}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {deleteConfirm === selectedNote.id ? (
                        <ConfirmDelete
                          onConfirm={() => handleDelete(selectedNote.id)}
                          onCancel={() => setDeleteConfirm(null)}
                          label="Delete note?"
                        />
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(selectedNote)}
                            className="px-3 py-1 text-xs font-medium border border-line-strong text-fg-2 rounded-xl hover:bg-surface-2 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(selectedNote.id)}
                            className="px-3 py-1 text-xs font-medium border border-red-300 text-neg rounded-xl hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {(selectedNote.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(selectedNote.tags ?? []).map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-soft text-accent-strong"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Content */}
                  <div className="prose prose-sm max-w-none">
                    <p className="text-fg-2 leading-relaxed whitespace-pre-wrap text-sm">
                      {selectedNote.content}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-2xl p-8 text-center">
              <p className="text-faint text-sm">Select a note to read it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
