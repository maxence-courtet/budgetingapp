import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";
import { date as parseDate, text } from "../services/validate";

const locks = new Map<string, Promise<unknown>>();

/** Run `fn` after any earlier call with the same key has finished (single backend process). */
function oncePerKey<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (locks.get(key) ?? Promise.resolve()).catch(() => undefined).then(fn);
  locks.set(key, run);
  run.finally(() => locks.get(key) === run && locks.delete(key)).catch(() => undefined);
  return run;
}

/** Trimmed tags, without empties or case-insensitive duplicates (first spelling wins). */
function cleanTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const tag = String(t).trim();
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      out.push(tag);
    }
  }
  return out;
}

const router = Router();
router.use(authMiddleware);

// List notes
router.get("/", async (req, res) => {
  const userId = req.userId!;
  const { linkedType, linkedId, tag, noteType, limit, dateFrom, dateTo } = req.query;

  const notes = await prisma.note.findMany({
    where: {
      userId,
      ...(linkedType ? { linkedType: String(linkedType) } : {}),
      ...(linkedId ? { linkedId: String(linkedId) } : {}),
      ...(noteType ? { noteType: String(noteType) } : {}),
      ...(tag ? { tags: { has: String(tag) } } : {}),
      ...(dateFrom || dateTo
        ? {
            entryDate: {
              ...(dateFrom ? { gte: parseDate(dateFrom, "dateFrom")! } : {}),
              ...(dateTo ? { lte: parseDate(dateTo, "dateTo")! } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit ? Number(limit) : 100,
  });
  res.json(notes);
});

// Get single note
router.get("/:id", async (req, res) => {
  const userId = req.userId!;
  const note = await prisma.note.findFirst({ where: { id: req.params.id, userId } });
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

// Create note
router.post("/", async (req, res) => {
  const userId = req.userId!;
  const { tags, noteType, linkedType, linkedId, source } = req.body;
  const title = text(req.body.title, "title", { max: 200 })!;
  const content = text(req.body.content, "content")!;
  const entryDate = parseDate(req.body.entryDate, "entryDate", { optional: true });

  // One journal entry per day: writing to a day that has one updates it instead of adding a duplicate.
  // Writes for the same user and day run one at a time, so simultaneous requests can't both create.
  if (noteType === "JOURNAL" && entryDate) {
    const result = await oncePerKey(`${userId}:${entryDate.toISOString().slice(0, 10)}`, async () => {
      const existing = await prisma.note.findFirst({ where: { userId, noteType: "JOURNAL", entryDate } });
      if (existing) return { status: 200, note: await prisma.note.update({ where: { id: existing.id }, data: { content } }) };
      const note = await prisma.note.create({
        data: { userId, title, content, tags: cleanTags(tags), noteType: "JOURNAL", entryDate, source: source === "MCP" ? "MCP" : "MANUAL" },
      });
      return { status: 201, note };
    });
    return res.status(result.status).json(result.note);
  }

  const note = await prisma.note.create({
    data: {
      userId,
      title,
      content,
      tags: cleanTags(tags),
      noteType: noteType ?? "NOTE",
      entryDate,
      linkedType: linkedType ?? null,
      linkedId: linkedId ?? null,
      source: source === "MCP" ? "MCP" : "MANUAL",
    },
  });
  res.status(201).json(note);
});

// Update note
router.put("/:id", async (req, res) => {
  const userId = req.userId!;
  const note = await prisma.note.findFirst({ where: { id: req.params.id, userId } });
  if (!note) return res.status(404).json({ error: "Note not found" });

  const { title, content, tags, noteType, linkedType, linkedId, entryDate } = req.body;
  const updated = await prisma.note.update({
    where: { id: req.params.id },
    data: {
      ...(title ? { title } : {}),
      ...(content ? { content } : {}),
      ...(tags ? { tags: cleanTags(tags) } : {}),
      ...(noteType ? { noteType } : {}),
      ...(entryDate !== undefined ? { entryDate: parseDate(entryDate, "entryDate", { optional: true }) } : {}),
      ...(linkedType !== undefined ? { linkedType } : {}),
      ...(linkedId !== undefined ? { linkedId } : {}),
    },
  });
  res.json(updated);
});

// Delete note
router.delete("/:id", async (req, res) => {
  const userId = req.userId!;
  const note = await prisma.note.findFirst({ where: { id: req.params.id, userId } });
  if (!note) return res.status(404).json({ error: "Note not found" });
  await prisma.note.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
