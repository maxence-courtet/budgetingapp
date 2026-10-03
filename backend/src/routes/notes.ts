import { Router } from "express";
import { authMiddleware } from "../middleware/auth";
import prisma from "../services/prisma";

const router = Router();
router.use(authMiddleware);

// List notes
router.get("/", async (req, res) => {
  const userId = req.userId!;
  const { linkedType, linkedId, tag, noteType, limit } = req.query;

  const notes = await prisma.note.findMany({
    where: {
      userId,
      ...(linkedType ? { linkedType: String(linkedType) } : {}),
      ...(linkedId ? { linkedId: String(linkedId) } : {}),
      ...(noteType ? { noteType: String(noteType) } : {}),
      ...(tag ? { tags: { has: String(tag) } } : {}),
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
  const { title, content, tags, noteType, linkedType, linkedId, source } = req.body;
  if (!title || !content) return res.status(400).json({ error: "title and content are required" });

  const note = await prisma.note.create({
    data: {
      userId,
      title,
      content,
      tags: Array.isArray(tags) ? tags : [],
      noteType: noteType ?? "NOTE",
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

  const { title, content, tags, noteType, linkedType, linkedId } = req.body;
  const updated = await prisma.note.update({
    where: { id: req.params.id },
    data: {
      ...(title ? { title } : {}),
      ...(content ? { content } : {}),
      ...(tags ? { tags: Array.isArray(tags) ? tags : [] } : {}),
      ...(noteType ? { noteType } : {}),
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
