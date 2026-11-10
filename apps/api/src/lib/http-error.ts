export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string[]> | undefined;

  constructor(status: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message: string) => new HttpError(400, "BAD_REQUEST", message);
export const unauthorized = (message = "Sign in required") =>
  new HttpError(401, "UNAUTHORIZED", message);
export const notFound = (message = "Not found") => new HttpError(404, "NOT_FOUND", message);
export const conflict = (message: string) => new HttpError(409, "CONFLICT", message);
export const validationError = (message: string, fields: Record<string, string[]>) =>
  new HttpError(400, "VALIDATION_ERROR", message, fields);
