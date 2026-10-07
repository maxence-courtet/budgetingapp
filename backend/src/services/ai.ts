import prisma from "./prisma";
import { PlanError, cheapestPlanWith, entitlementsOf } from "./plans";

export class AiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** OpenAI-compatible endpoint for AI features; Proton Lumo unless AI_BASE_URL says otherwise. */
const BASE_URL = (process.env.AI_BASE_URL || "https://lumo.proton.me/api/ai/v1").replace(/\/$/, "");
const MODEL = process.env.AI_MODEL || "lumo";

function todayUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Run a paid AI call only if the user's plan includes it and they're under today's limit, and count it
 * once it succeeds (failed calls don't use up the allowance).
 */
export async function withAiQuota<T>(userId: string, feature: "insights" | "weekly-review", call: () => Promise<T>): Promise<T> {
  // The daily allowance comes with the plan (services/plans.ts); 0 means the plan doesn't include it.
  const { entitlements } = await entitlementsOf(userId);
  const limit = feature === "insights" ? entitlements.aiInsightsPerDay : entitlements.aiReviewsPerDay;
  if (limit === 0) {
    const required = cheapestPlanWith((e) => (feature === "insights" ? e.aiInsightsPerDay : e.aiReviewsPerDay) > 0);
    throw new PlanError(`AI ${feature === "insights" ? "next moves are" : "weekly reviews are"} part of Hive ${required === "PLUS" ? "Plus" : "Pro"}.`, required);
  }
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

/** Pull the JSON object out of a reply that may wrap it in prose or a ```json fence. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * One chat-completions call that must answer with JSON matching `schema`. Works with any
 * OpenAI-compatible API (Lumo by default). Errors carry an HTTP status.
 */
export async function generateJson<T>(system: string, schema: { [key: string]: unknown }, userContent: string): Promise<T> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AiError("AI features are not configured: set AI_API_KEY on the backend", 503);
  }

  // Not every OpenAI-compatible provider enforces response_format json_schema, so the schema is also
  // spelled out in the prompt and the reply is parsed leniently.
  const instructions = `${system}\n\nAnswer with a single JSON object, and nothing else, that matches this JSON Schema:\n${JSON.stringify(schema)}`;

  const request = (jsonMode: boolean) =>
    fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: userContent },
        ],
        ...(jsonMode && { response_format: { type: "json_object" } }),
      }),
      signal: AbortSignal.timeout(120_000),
    });

  let res: Response;
  try {
    res = await request(true);
    // Some compatible APIs reject response_format; the prompt already asks for JSON, so retry without it.
    if (res.status === 400 || res.status === 422) res = await request(false);
  } catch (err) {
    throw new AiError(`AI service unreachable: ${(err as Error).message}`, 502);
  }

  if (res.status === 401 || res.status === 403) {
    throw new AiError("AI features are not configured: AI_API_KEY is missing or invalid", 503);
  }
  if (res.status === 429) {
    throw new AiError("AI service is rate limited, try again in a minute", 429);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new AiError(`AI service error (${res.status}): ${detail}`, 502);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  };
  const choice = body.choices?.[0];
  if (choice?.message?.refusal) {
    throw new AiError("The AI declined to analyse this data", 502);
  }
  if (choice?.finish_reason === "length") {
    throw new AiError("The AI response was cut off, try again", 502);
  }
  const content = choice?.message?.content;
  if (!content) {
    throw new AiError("The AI returned no analysis", 502);
  }
  try {
    return extractJson(content) as T;
  } catch {
    throw new AiError("The AI reply was not valid JSON, try again", 502);
  }
}
