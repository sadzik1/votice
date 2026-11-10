import type { ApiError } from "@survey/shared";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";

function sendError(
  res: Parameters<RequestHandler>[1],
  status: number,
  error: ApiError["error"],
): void {
  res.status(status).json({ error } satisfies ApiError);
}

function toFieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    fields[key] ??= [];
    fields[key].push(issue.message);
  }
  return fields;
}

export const apiNotFound: RequestHandler = (req, res) => {
  sendError(res, 404, {
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    sendError(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      fields: toFieldErrors(err),
    });
    return;
  }

  if (err instanceof HttpError) {
    sendError(res, err.status, {
      code: err.code,
      message: err.message,
      ...(err.fields && { fields: err.fields }),
    });
    return;
  }

  // invalid JSON body (express.json)
  if (err instanceof SyntaxError && "type" in err && err.type === "entity.parse.failed") {
    sendError(res, 400, { code: "INVALID_JSON", message: "Request body is not valid JSON" });
    return;
  }

  console.error(err);
  sendError(res, 500, { code: "INTERNAL_ERROR", message: "Something went wrong" });
};
