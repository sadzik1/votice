import type { ApiError } from "@survey/shared";
import { rateLimit } from "express-rate-limit";

export type RateLimitConfig = {
  windowMs: number;
  limit: number;
};

export function createRateLimiter({ windowMs, limit }: RateLimitConfig) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: "RATE_LIMITED", message: "Too many requests. Try again in a few minutes." },
      } satisfies ApiError);
    },
  });
}
