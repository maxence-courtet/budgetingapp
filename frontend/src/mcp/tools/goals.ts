import { z } from "zod";
import { api } from "../client";

export const goalTools = [
  {
    name: "get_goals",
    description: "List all goals with progress information.",
    inputSchema: z.object({
      status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
      type: z.enum(["FINANCIAL", "HABIT", "FITNESS", "PERSONAL"]).optional(),
    }),
    handler: async (params: { status?: string; type?: string }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][])
      ).toString();
      return api(`/goals${qs ? `?${qs}` : ""}`);
    },
  },
  {
    name: "update_goal_progress",
    description: "Update the current progress value of a goal.",
    inputSchema: z.object({
      goalId: z.string(),
      currentValue: z.number().describe("New current value for the goal"),
    }),
    handler: async ({ goalId, currentValue }: { goalId: string; currentValue: number }) => {
      return api(`/goals/${goalId}/progress`, { method: "PATCH", body: { currentValue } });
    },
  },
];
