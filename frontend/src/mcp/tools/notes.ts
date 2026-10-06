import { z } from "zod";
import { api } from "../client";

export const noteTools = [
  {
    name: "get_notes",
    description: "Search and list notes. All filters are optional.",
    inputSchema: z.object({
      tag: z.string().optional().describe("Filter by tag"),
      linkedType: z.enum(["TRANSACTION", "MONTH", "GOAL", "HABIT"]).optional(),
      noteType: z.enum(["NOTE", "JOURNAL"]).optional(),
      dateFrom: z.string().optional().describe("Journal entries on or after this day (YYYY-MM-DD)"),
      dateTo: z.string().optional().describe("Journal entries on or before this day (YYYY-MM-DD)"),
      limit: z.number().default(20),
    }),
    handler: async (params: Record<string, any>) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return api(`/notes?${qs}`);
    },
  },
  {
    name: "add_note",
    description:
      "Create a new note. Can be linked to a specific entity (goal, habit, month, transaction). " +
      "For noteType JOURNAL there is one entry per day (entryDate, default today): writing to a day that " +
      "already has an entry appends to it.",
    inputSchema: z.object({
      title: z.string(),
      content: z.string().describe("Note content in markdown"),
      tags: z.array(z.string()).default([]),
      noteType: z.enum(["NOTE", "JOURNAL"]).default("NOTE"),
      linkedType: z.enum(["TRANSACTION", "MONTH", "GOAL", "HABIT"]).optional(),
      linkedId: z.string().optional(),
      entryDate: z.string().optional().describe("JOURNAL only: the day the entry is about (YYYY-MM-DD)"),
    }),
    handler: async (data: any) => {
      if (data.noteType === "JOURNAL") {
        const day = data.entryDate ?? new Date().toISOString().slice(0, 10);
        const existing = await api(`/notes?noteType=JOURNAL&dateFrom=${day}&dateTo=${day}&limit=1`);
        if (Array.isArray(existing) && existing.length > 0) {
          const entry = existing[0];
          return api(`/notes/${entry.id}`, {
            method: "PUT",
            body: { content: `${entry.content}\n\n${data.content}` },
          });
        }
        return api("/notes", { method: "POST", body: { ...data, entryDate: day, source: "MCP" } });
      }
      return api("/notes", { method: "POST", body: { ...data, source: "MCP" } });
    },
  },
];
