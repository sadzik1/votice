import { ApiRequestError } from "../api/client.ts";

export type FieldErrors = Record<string, string>;

type Issue = { path: readonly PropertyKey[]; message: string };

export function issuesToFieldErrors(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "_root";
    errors[key] ??= issue.message;
  }
  return errors;
}

export function apiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiRequestError) || !error.body?.error.fields) return {};
  const errors: FieldErrors = {};
  for (const [key, messages] of Object.entries(error.body.error.fields)) {
    if (messages[0]) errors[key] = messages[0];
  }
  return errors;
}

export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// relative paths only, so ?next= can't redirect to another site
export function safeNextPath(next: string | null, fallback = "/surveys"): string {
  if (!next?.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
