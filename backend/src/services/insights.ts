import { generateJson } from "./ai";

export interface LifeInsights {
  summary: string;
  highlights: string[];
  alerts: { severity: "info" | "warning" | "critical"; message: string }[];
  suggestions: string[];
}

const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    alerts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["info", "warning", "critical"] },
          message: { type: "string" },
        },
        required: ["severity", "message"],
        additionalProperties: false,
      },
    },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "highlights", "alerts", "suggestions"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are the analytics assistant inside Life Hub, a personal app that tracks finances, habits, fitness, goals and notes for a single user.

You receive a JSON snapshot of the user's data and write a short, personal analysis addressed to them as "you".

- summary: 2-4 sentences on how things are going overall.
- highlights: up to 4 things going well, each one sentence, citing the numbers.
- alerts: up to 4 things needing attention (overspending, goals at risk, habits slipping). Use "critical" only for an imminent deadline or a negative monthly net. Return an empty array if nothing needs attention.
- suggestions: up to 3 concrete next actions.

If the snapshot includes "patterns" (statistical links found in the last 90 days, e.g. spending vs habits), mention the strongest one where it is useful, as a correlation rather than a cause.

Only state facts supported by the snapshot. Where a module has no data, don't invent any; at most suggest starting to track it. Monetary amounts are in the user's account currency, with no currency symbol.`;

export async function generateInsights(overview: unknown): Promise<LifeInsights> {
  return generateJson<LifeInsights>(
    SYSTEM_PROMPT,
    INSIGHTS_SCHEMA,
    `Here is my Life Hub snapshot:\n\n${JSON.stringify(overview, null, 2)}`
  );
}
