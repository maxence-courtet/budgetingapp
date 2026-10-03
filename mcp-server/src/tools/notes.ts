import { z } from "zod";
import { api } from "../client.js";

export const noteTools = [
  {
    name: "get_notes",
    description: "Search and list notes. All filters are optional.",
    inputSchema: z.object({
      tag: z.string().optional().describe("Filter by tag"),
      linkedType: z.enum(["TRANSACTION", "MONTH", "GOAL", "HABIT"]).optional(),
      noteType: z.enum(["NOTE", "JOURNAL"]).optional(),
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
    description: "Create a new note. Can be linked to a specific entity (goal, habit, month, transaction).",
    inputSchema: z.object({
      title: z.string(),
      content: z.string().describe("Note content in markdown"),
      tags: z.array(z.string()).default([]),
      noteType: z.enum(["NOTE", "JOURNAL"]).default("NOTE"),
      linkedType: z.enum(["TRANSACTION", "MONTH", "GOAL", "HABIT"]).optional(),
      linkedId: z.string().optional(),
    }),
    handler: async (data: any) => {
      return api("/notes", { method: "POST", body: { ...data, source: "MCP" } });
    },
  },
];
