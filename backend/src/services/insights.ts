import Anthropic from "@anthropic-ai/sdk";

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

Only state facts supported by the snapshot. Where a module has no data, don't invent any; at most suggest starting to track it. Monetary amounts are in the user's account currency, with no currency symbol.`;

class InsightsError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let client: Anthropic | null = null;

export async function generateInsights(overview: unknown): Promise<LifeInsights> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new InsightsError("AI insights are not configured: set ANTHROPIC_API_KEY in backend/.env", 503);
  }

  let response;
  try {
    client ??= new Anthropic();
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: INSIGHTS_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is my Life Hub snapshot:\n\n${JSON.stringify(overview, null, 2)}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new InsightsError("AI insights are not configured: ANTHROPIC_API_KEY is missing or invalid", 503);
    } else if (err instanceof Anthropic.RateLimitError) {
      throw new InsightsError("AI service is rate limited, try again in a minute", 429);
    } else if (err instanceof Anthropic.APIError) {
      throw new InsightsError(`AI service error: ${err.message}`, 502);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new InsightsError("The AI declined to analyse this data", 502);
  }
  if (response.stop_reason === "max_tokens") {
    throw new InsightsError("The AI response was cut off, try again", 502);
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new InsightsError("The AI returned no analysis", 502);
  }
  return JSON.parse(text.text) as LifeInsights;
}
