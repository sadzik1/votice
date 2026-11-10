import type { ApiError } from "@survey/shared";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiError | null;

  constructor(status: number, body: ApiError | null) {
    super(body?.error.message ?? `Request failed with status ${status}`);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }

  get code(): string | undefined {
    return this.body?.error.code;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // see api/src/middleware/csrf.ts
  headers.set("X-Requested-With", "fetch");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers, credentials: "include" });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiRequestError(res.status, body as ApiError | null);
  return body as T;
}

export function sendJson<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
) {
  return apiFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
