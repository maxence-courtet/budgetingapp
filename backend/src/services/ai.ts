import Anthropic from "@anthropic-ai/sdk";

export class AiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let client: Anthropic | null = null;

/** One Claude call that must answer with JSON matching `schema`. Errors carry an HTTP status. */
export async function generateJson<T>(system: string, schema: { [key: string]: unknown }, userContent: string): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new AiError("AI features are not configured: set ANTHROPIC_API_KEY in backend/.env", 503);
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
