import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CSRF, db, makeApp, resetDb, signUp } from "./helpers.js";

const { app } = makeApp();

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("POST /api/auth/register", () => {
  it("creates the user, starts a session and never returns the password hash", async () => {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/auth/register")
      .set(CSRF)
      .send({ name: "Ann", email: "Ann@Example.com", password: "password-123" });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: "Ann",
      email: "ann@example.com",
    });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("ann@example.com");
  });

  it("stores only a hash of the session token", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set(CSRF)
      .send({ name: "Ann", email: "ann@example.com", password: "password-123" });
    const token = /sid=([^;]+)/.exec(res.headers["set-cookie"]?.[0] ?? "")?.[1];

    const sessions = await db.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.tokenHash).not.toBe(token);
  });

  it("rejects a duplicate email with 409", async () => {
    const { credentials } = await signUp(app);
    const res = await request(app).post("/api/auth/register").set(CSRF).send(credentials);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("returns field errors for invalid input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set(CSRF)
      .send({ name: "", email: "nope", password: "123" });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.fields)).toEqual(
      expect.arrayContaining(["name", "email", "password"]),
    );
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password", async () => {
    const { credentials } = await signUp(app);
    const agent = request.agent(app);

    const res = await agent
      .post("/api/auth/login")
      .set(CSRF)
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect((await agent.get("/api/auth/me")).status).toBe(200);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const { credentials } = await signUp(app);

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .set(CSRF)
      .send({ email: credentials.email, password: "wrong-password" });
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .set(CSRF)
      .send({ email: "ghost@example.com", password: "wrong-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("rate-limits repeated attempts", async () => {
    const { app: strictApp } = makeApp({
      rateLimits: {
        auth: { windowMs: 60_000, limit: 2 },
        responses: { windowMs: 60_000, limit: 2 },
      },
    });
    const attempt = () =>
      request(strictApp).post("/api/auth/login").set(CSRF).send({ email: "a@b.co", password: "x" });

    await attempt();
    await attempt();
    const third = await attempt();

    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("POST /api/auth/logout", () => {
  it("ends the session on the server, not just in the browser", async () => {
    const { agent } = await signUp(app);
    expect(await db.session.count()).toBe(1);

    const res = await agent.post("/api/auth/logout").set(CSRF);

    expect(res.status).toBe(204);
    expect(await db.session.count()).toBe(0);
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});

describe("sessions", () => {
  it("rejects an expired session", async () => {
    const { agent } = await signUp(app);
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await agent.get("/api/auth/me")).status).toBe(401);
    expect(await db.session.count()).toBe(0);
  });
});
