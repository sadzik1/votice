import { join } from "node:path";
import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import helmet from "helmet";
import { type Db, isDbReachable } from "./db.js";
import type { SurveyEvents } from "./lib/events.js";
import { loadUser } from "./middleware/auth.js";
import { requireCsrfHeader } from "./middleware/csrf.js";
import { apiNotFound, errorHandler } from "./middleware/error-handler.js";
import type { RateLimitConfig } from "./middleware/rate-limit.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { publicRouter } from "./routes/public.js";
import { surveysRouter } from "./routes/surveys.js";

export type AppConfig = {
  secureCookies: boolean;
  trustProxy: boolean;
  rateLimits: {
    auth: RateLimitConfig;
    responses: RateLimitConfig;
  };
  // production: serve the built frontend from here
  staticDir?: string;
};

export type AppDeps = {
  db: Db;
  config: AppConfig;
  events: SurveyEvents;
  checkDb?: () => Promise<boolean>;
};

export const DEFAULT_RATE_LIMITS: AppConfig["rateLimits"] = {
  auth: { windowMs: 15 * 60_000, limit: 20 },
  responses: { windowMs: 60_000, limit: 10 },
};

export function createApp(deps: AppDeps): Express {
  const { db, config } = deps;
  const app = express();

  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        // no https locally
        directives: config.secureCookies ? {} : { upgradeInsecureRequests: null },
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // before loadUser so it still answers when the db is down
  app.use("/api/health", healthRouter(deps.checkDb ?? (() => isDbReachable(db))));

  app.use("/api", requireCsrfHeader, loadUser(db));
  app.use("/api/auth", authRouter(deps));
  app.use("/api/surveys", surveysRouter(deps));
  app.use("/api/public", publicRouter(deps));

  app.use("/api", apiNotFound);
  if (config.staticDir) serveWebApp(app, config.staticDir);
  app.use(errorHandler);

  return app;
}

function serveWebApp(app: Express, dir: string): void {
  app.use("/assets", express.static(join(dir, "assets"), { immutable: true, maxAge: "1y" }));
  // don't fall through to index.html for missing assets
  app.use("/assets", (_req, res) => {
    res.status(404).end();
  });
  app.use(express.static(dir, { index: false }));
  // SPA fallback
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(join(dir, "index.html"));
  });
}
