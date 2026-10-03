const API_BASE = process.env.LIFE_HUB_API_URL ?? "http://localhost:3001/api";
const SERVICE_TOKEN = process.env.LIFE_HUB_SERVICE_TOKEN;

if (!SERVICE_TOKEN) {
  console.error("LIFE_HUB_SERVICE_TOKEN env var is required");
  process.exit(1);
}

export async function api(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_TOKEN}`,
    },
    ...(options?.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `API ${options?.method ?? "GET"} ${path} failed (${res.status}): ${(err as any).error ?? res.statusText}`
    );
  }

  if (res.status === 204) return null;
  return res.json();
}
