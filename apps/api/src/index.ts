import { resolve } from "node:path";
import { createApp, DEFAULT_RATE_LIMITS } from "./app.js";
import { createDb, poolMaxFromEnv } from "./db.js";
import { env } from "./env.js";
import { SurveyEvents } from "./lib/events.js";

const isProduction = env.NODE_ENV === "production";
const db = createDb(env.DATABASE_URL, { poolMax: poolMaxFromEnv() });

const app = createApp({
  db,
  events: new SurveyEvents(),
  config: {
    secureCookies: env.COOKIE_SECURE ?? isProduction,
    trustProxy: isProduction,
    rateLimits: DEFAULT_RATE_LIMITS,
    staticDir: isProduction
      ? (env.WEB_DIST_DIR ?? resolve(import.meta.dirname, "../../web/dist"))
      : undefined,
  },
});

const server = app.listen(env.PORT, (error) => {
  if (error) throw error;
  console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown(signal: string): void {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
  // open SSE connections would block close()
  server.closeAllConnections();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
