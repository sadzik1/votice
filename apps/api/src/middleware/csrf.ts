import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// extra CSRF check on top of SameSite cookies: a cross-origin page can't send
// a custom header without a CORS preflight, and CORS isn't enabled
export const requireCsrfHeader: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method) || req.get("X-Requested-With") === "fetch") {
    next();
    return;
  }
  throw new HttpError(403, "CSRF_CHECK_FAILED", "Missing X-Requested-With header");
};
