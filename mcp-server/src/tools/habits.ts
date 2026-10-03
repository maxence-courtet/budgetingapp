import { z } from "zod";
import { api } from "../client.js";

export const habitTools = [
  {
    name: "get_habits",
    description: "List all habits and their recent completion status.",
    inputSchema: z.object({}),
    handler: async () => api("/habits"),
  },
  {
    name: "get_habits_summary",
    description: "Get habit completion rates for a date range. Returns per-habit completion counts.",
    inputSchema: z.object({
      dateFrom: z.string().describe("ISO date YYYY-MM-DD"),
      dateTo: z.string().describe("ISO date YYYY-MM-DD"),
    }),
    handler: async ({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) => {
      const habits = await api("/habits") as any[];
      const logs = await Promise.all(
        habits.map((h: any) =>
          api(`/habits/${h.id}/logs?dateFrom=${dateFrom}&dateTo=${dateTo}`)
            .then((l: any) => ({ habitId: h.id, habitName: h.name, logs: l }))
        )
      );
      return logs.map(({ habitId, habitName, logs: habitLogs }: any) => ({
        habitId,
        habitName,
        completedDays: (habitLogs as any[]).filter((l: any) => l.completed).length,
        totalLogs: (habitLogs as any[]).length,
      }));
    },
  },
  {
    name: "log_habit",
    description: "Log a habit completion. Creates a pending entry that requires user validation in the app.",
    inputSchema: z.object({
      habitId: z.string().describe("Habit ID (use get_habits to find it)"),
      date: z.string().describe("ISO date YYYY-MM-DD"),
      completed: z.boolean().default(true),
      note: z.string().optional(),
    }),
    handler: async ({ habitId, date, completed, note }: any) => {
      return api(`/habits/${habitId}/logs`, {
        method: "POST",
        body: { date, completed, note, source: "MCP" },
      });
    },
  },
];
