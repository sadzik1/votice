import request from "supertest";
import { describe, expect, it } from "vitest";
import { type AppConfig, createApp } from "./app.js";
import type { Db } from "./db.js";
import { SurveyEvents } from "./lib/events.js";

// none of these touch the database
const config: AppConfig = {
  secureCookies: false,
  trustProxy: false,
  rateLimits: {
    auth: { windowMs: 60_000, limit: 100 },
    responses: { windowMs: 60_000, limit: 100 },
  },
};

const appWithDb = (up: boolean) =>
  createApp({ db: {} as Db, config, events: new SurveyEvents(), checkDb: async () => up });

describe("GET /api/health", () => {
  it("reports that the database is up", async () => {
    const res = await request(appWithDb(true)).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "up" });
  });

  it("does not look up the session, so it works with a cookie while the database is down", async () => {
    const res = await request(appWithDb(false)).get("/api/health").set("Cookie", "sid=some-token");

    expect(res.status).toBe(200);
    expect(res.body.db).toBe("down");
  });

  it("still answers when the database is down", async () => {
    const res = await request(appWithDb(false)).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "down" });
  });
});

describe("security middleware", () => {
  it("sets security headers", async () => {
    const res = await request(appWithDb(true)).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
  });

  it("rejects state-changing requests without the CSRF header", async () => {
    const res = await request(appWithDb(true)).post("/api/auth/logout");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_CHECK_FAILED");
  });

  it("requires a session for /api/auth/me", async () => {
    const res = await request(appWithDb(true)).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("error responses", () => {
  it("returns a JSON 404 for unknown API routes", async () => {
    const res = await request(appWithDb(true)).get("/api/nope");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(appWithDb(true))
      .post("/api/health")
      .set("Content-Type", "application/json")
      .send("{not json");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});
