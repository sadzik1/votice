import { surveyInputSchema } from "@survey/shared";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { notFound } from "../lib/http-error.js";
import { errorHandler } from "./error-handler.js";

function appThatThrows(handler: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.post("/test", handler);
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("maps zod errors to 400 with field paths", async () => {
    const app = appThatThrows((req) => {
      surveyInputSchema.parse(req.body);
    });

    const res = await request(app)
      .post("/test")
      .send({ title: "", questions: [{ type: "TEXT", title: "" }] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.fields)).toEqual(
      expect.arrayContaining(["title", "questions.0.title"]),
    );
  });

  it("maps HttpError to its status and code", async () => {
    const app = appThatThrows(() => {
      throw notFound("Survey not found");
    });

    const res = await request(app).post("/test");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Survey not found" } });
  });

  it("hides internal error details", async () => {
    const app = appThatThrows(() => {
      throw new Error("db password is hunter2");
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await request(app).post("/test");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
    spy.mockRestore();
  });
});
