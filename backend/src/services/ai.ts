import Anthropic from "@anthropic-ai/sdk";
import prisma from "./prisma";

export class AiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let client: Anthropic | null = null;

/** Model for AI features; AI_MODEL can point at a cheaper one (e.g. claude-sonnet-5-5) to cut costs. */
const MODEL = process.env.AI_MODEL || "claude-opus-5-5";

const DAILY_LIMITS: Record<string, number> = {
  insights: Number(process.env.AI_INSIGHTS_DAILY_LIMIT) || 5,
  "weekly-review": Number(process.env.AI_REVIEW_DAILY_LIMIT) || 3,
};

function todayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Run a paid AI call only if the user is under today's limit for that feature, and count it
 * once it succeeds (failed calls don't use up the allowance).
 */
export async function withAiQuota<T>(userId: string, feature: "insights" | "weekly-review", call: () => Promise<T>): Promise<T> {
  const limit = DAILY_LIMITS[feature];
  const day = todayUtcDate();
  const key = { userId_day_feature: { userId, day, feature } };
  const used = (await prisma.aiUsage.findUnique({ where: key }))?.count ?? 0;
  if (used >= limit) {
    throw new AiError(`You've used today's ${limit} AI ${feature === "insights" ? "analyses" : "reviews"}. Try again tomorrow.`, 429);
  }
  const result = await call();
  await prisma.aiUsage.upsert({
    where: key,
    create: { userId, day, feature, count: 1 },
    update: { count: { increment: 1 } },
  });
  return result;
}

/** One Claude call that must answer with JSON matching `schema`. Errors carry an HTTP status. */
export async function generateJson<T>(system: string, schema: { [key: string]: unknown }, userContent: string): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new AiError("AI features are not configured: set ANTHROPIC_API_KEY in backend/.env", 503);
  }

  let response;
  try {
    client ??= new Anthropic();
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema },
      },
      system,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AiError("AI features are not configured: ANTHROPIC_API_KEY is missing or invalid", 503);
    } else if (err instanceof Anthropic.RateLimitError) {
      throw new AiError("AI service is rate limited, try again in a minute", 429);
    } else if (err instanceof Anthropic.APIError) {
      throw new AiError(`AI service error: ${err.message}`, 502);
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new AiError("The AI declined to analyse this data", 502);
  }
  if (response.stop_reason === "max_tokens") {
    throw new AiError("The AI response was cut off, try again", 502);
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new AiError("The AI returned no analysis", 502);
  }
  return JSON.parse(text.text) as T;
}
