import { z } from "zod";
import { api } from "../client";

export const fitnessTools = [
  {
    name: "get_fitness_history",
    description: "Get fitness measurement history for a specific metric type.",
    inputSchema: z.object({
      type: z.string().describe("Metric type: WEIGHT, BODY_FAT, STEPS, WORKOUT_DURATION, etc."),
      limit: z.number().default(30).describe("Max entries to return"),
    }),
    handler: async ({ type, limit }: { type: string; limit: number }) => {
      return api(`/fitness?type=${encodeURIComponent(type)}&limit=${limit}`);
    },
  },
  {
    name: "log_fitness",
    description: "Log a fitness measurement. Creates a pending entry requiring user validation.",
    inputSchema: z.object({
      type: z.string().describe("Metric type: WEIGHT, BODY_FAT, STEPS, etc."),
      value: z.number(),
      unit: z.string().describe("Unit: kg, lbs, %, steps, min, etc."),
      date: z.string().describe("ISO date YYYY-MM-DD"),
      note: z.string().optional(),
    }),
    handler: async ({ type, value, unit, date, note }: any) => {
      return api("/fitness", {
        method: "POST",
        body: { type, value, unit, date, note, source: "MCP" },
      });
    },
  },
  {
    name: "generate_fitness_plan",
    description: "Generate an AI fitness plan for a goal based on the user's fitness stats. Creates a FitnessPlan with daily sessions and auto-creates Habits for each workout day. The plan requires user validation in the app.",
    inputSchema: z.object({
      goalId: z.string().describe("Goal ID to generate a plan for"),
      durationWeeks: z.number().default(8).describe("Plan duration in weeks"),
      workoutsPerWeek: z.number().default(4).describe("Target workouts per week"),
    }),
    handler: async ({ goalId, durationWeeks, workoutsPerWeek }: any) => {
      // Gather context: goal + fitness history
      const [goal, fitnessEntries] = await Promise.all([
        api(`/goals/${goalId}`),
        api("/fitness?limit=50"),
      ]) as [any, any[]];

      if (!goal) return { error: "Goal not found" };

      // Build summary for Claude to generate the plan
      // NOTE: In production, this would call Claude API directly.
      // For now, return the context so the MCP caller (Claude) can use it
      // to generate a plan and then call create_fitness_plan_from_data.
      return {
        goal,
        fitnessHistory: fitnessEntries,
        instructions: `Based on the goal "${goal.title}" (type: ${goal.type}, target: ${goal.targetValue} ${goal.unit}, deadline: ${goal.deadline}) and the provided fitness history, generate a ${durationWeeks}-week fitness plan with ${workoutsPerWeek} workouts per week. Then call create_fitness_plan to save it.`,
      };
    },
  },
  {
    name: "create_fitness_plan",
    description: "Save an AI-generated fitness plan tied to a goal. Auto-creates Habits for each unique workout type in the plan.",
    inputSchema: z.object({
      goalId: z.string(),
      title: z.string(),
      description: z.string().describe("Full plan narrative in markdown"),
      durationWeeks: z.number(),
      startDate: z.string().describe("ISO date YYYY-MM-DD"),
      days: z.array(z.object({
        weekNumber: z.number(),
        dayOfWeek: z.number().min(1).max(7),
        activityType: z.enum(["WORKOUT", "REST", "ACTIVE_RECOVERY"]),
        title: z.string(),
        description: z.string(),
      })),
    }),
    handler: async ({ goalId, title, description, durationWeeks, startDate, days }: any) => {
      // Create plan via a backend endpoint (we'll add a direct DB write endpoint)
      // For now, this returns the data structure for the user to validate
      return {
        status: "pending_validation",
        message: "Fitness plan data generated. The backend /api/fitness/plans endpoint will be used to persist this once the user approves.",
        planData: { goalId, title, description, durationWeeks, startDate, days },
      };
    },
  },
  {
    name: "get_fitness_plan",
    description: "Get the current fitness plan for a goal.",
    inputSchema: z.object({
      goalId: z.string(),
    }),
    handler: async ({ goalId }: { goalId: string }) => {
      const goal = await api(`/goals/${goalId}`) as any;
      if (!goal?.fitnessPlan) return { error: "No fitness plan found for this goal." };
      return goal.fitnessPlan;
    },
  },
];
