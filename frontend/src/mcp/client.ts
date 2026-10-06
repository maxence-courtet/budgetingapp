import { AsyncLocalStorage } from "node:async_hooks";

// Tools call the backend REST API as the user the MCP request was authenticated for.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const backendToken = new AsyncLocalStorage<string>();

/** Runs `fn` (one MCP request) with every `api()` call inside it authenticated by `token`. */
export function withBackendToken<T>(token: string, fn: () => T): T {
  return backendToken.run(token, fn);
}

export async function api(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<unknown> {
  const token = backendToken.getStore();
  if (!token) throw new Error("No authenticated user for this request");

  const res = await fetch(`${API_BASE}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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
