import type { AddressInfo } from "node:net";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CSRF, db, makeApp, resetDb, sampleSurvey, signUp } from "./helpers.js";

const { app } = makeApp();

beforeEach(resetDb);
afterAll(() => db.$disconnect());

type Question = { id: string; options: { id: string }[] };

async function publishedSurvey() {
  const owner = await signUp(app);
  const created = await owner.agent.post("/api/surveys").set(CSRF).send(sampleSurvey);
  const survey = created.body.survey as { id: string; slug: string; questions: Question[] };
  await owner.agent.post(`/api/surveys/${survey.id}/status`).set(CSRF).send({ status: "OPEN" });
  const [single, multi, scale, text] = survey.questions as [Question, Question, Question, Question];
  return { owner, survey, single, multi, scale, text };
}

// plain request() = new browser, so a new respondent cookie each time
function respond(slug: string, answers: unknown[]) {
  return request(app).post(`/api/public/surveys/${slug}/responses`).set(CSRF).send({ answers });
}

describe("GET /api/surveys/:id/results", () => {
  it("aggregates answers per option, scale value and question", async () => {
    const { owner, survey, single, multi, scale, text } = await publishedSurvey();
    const [great, okay] = single.options as [{ id: string }, { id: string }];
    const [planning, reviews] = multi.options as [{ id: string }, { id: string }];

    await respond(survey.slug, [
      { questionId: single.id, optionIds: [great.id] },
      { questionId: multi.id, optionIds: [planning.id, reviews.id] },
      { questionId: scale.id, value: 5 },
      { questionId: text.id, text: "Nice" },
    ]);
    await respond(survey.slug, [
      { questionId: single.id, optionIds: [great.id] },
      { questionId: multi.id, optionIds: [planning.id] },
      { questionId: scale.id, value: 2 },
    ]);
    await respond(survey.slug, [
      { questionId: single.id, optionIds: [okay.id] },
      { questionId: scale.id, value: 5 },
    ]);

    const res = await owner.agent.get(`/api/surveys/${survey.id}/results`);
    const { results } = res.body;

    expect(res.status).toBe(200);
    expect(results.totalResponses).toBe(3);
    expect(results.lastResponseAt).toEqual(expect.any(String));

    const [q1, q2, q3, q4] = results.questions;
    expect(q1.options.map((o: { count: number }) => o.count)).toEqual([2, 1, 0]);
    expect(q1.answered).toBe(3);
    expect(q2.options.map((o: { count: number }) => o.count)).toEqual([2, 1, 0]);
    expect(q2.answered).toBe(2); // 3 rows, 2 people
    expect(q3.distribution).toEqual([
      { value: 1, count: 0 },
      { value: 2, count: 1 },
      { value: 3, count: 0 },
      { value: 4, count: 0 },
      { value: 5, count: 2 },
    ]);
    expect(q3.average).toBe(4);
    expect(q4).toMatchObject({ type: "TEXT", answered: 1 });
  });

  it("is only visible to the owner", async () => {
    const { survey } = await publishedSurvey();
    const stranger = await signUp(app);
    expect((await stranger.agent.get(`/api/surveys/${survey.id}/results`)).status).toBe(404);
  });
});

describe("text answers", () => {
  it("pages through answers newest first", async () => {
    const { owner, survey, single, scale, text } = await publishedSurvey();
    for (const word of ["first", "second", "third"]) {
      await respond(survey.slug, [
        { questionId: single.id, optionIds: [single.options[0]?.id] },
        { questionId: scale.id, value: 3 },
        { questionId: text.id, text: word },
      ]);
    }
    const url = `/api/surveys/${survey.id}/questions/${text.id}/answers`;

    const page1 = await owner.agent.get(url).query({ limit: 2 });
    const page2 = await owner.agent.get(url).query({ limit: 2, cursor: page1.body.nextCursor });

    expect(page1.body.items.map((a: { text: string }) => a.text)).toEqual(["third", "second"]);
    expect(page2.body.items.map((a: { text: string }) => a.text)).toEqual(["first"]);
    expect(page2.body.nextCursor).toBeNull();
  });
});

describe("GET /api/surveys/:id/export.csv", () => {
  it("exports one row per response with readable answers", async () => {
    const { owner, survey, single, multi, scale, text } = await publishedSurvey();
    await respond(survey.slug, [
      { questionId: single.id, optionIds: [single.options[1]?.id] },
      { questionId: multi.id, optionIds: [multi.options[2]?.id, multi.options[0]?.id] },
      { questionId: scale.id, value: 4 },
      { questionId: text.id, text: "=SUM(A1), quoted" },
    ]);

    const res = await owner.agent.get(`/api/surveys/${survey.id}/export.csv`);
    const lines = res.text.replace(/^﻿/, "").trim().split("\r\n");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("attachment");
    expect(lines[0]).toBe(
      "Submitted at,Overall mood,What went well?,Rate the sprint,Anything else?",
    );
    expect(lines[1]).toMatch(/,Okay,Planning; Releases,4,"'=SUM\(A1\), quoted"$/);
  });
});

describe("GET /api/surveys/:id/results/stream", () => {
  it("pushes an event when a response arrives", async () => {
    const { survey, single, scale, credentials } = await publishedSurvey().then(async (s) => ({
      ...s,
      credentials: s.owner.credentials,
    }));
    const login = await request(app).post("/api/auth/login").set(CSRF).send(credentials);
    const cookie = login.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";

    const server = app.listen(0);
    const { port } = server.address() as AddressInfo;
    const abort = new AbortController();

    try {
      const stream = await fetch(
        `http://localhost:${port}/api/surveys/${survey.id}/results/stream`,
        {
          headers: { cookie },
          signal: abort.signal,
        },
      );
      expect(stream.headers.get("content-type")).toContain("text/event-stream");
      const reader = (stream.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();

      await reader.read(); // "retry: 5000"
      await respond(survey.slug, [
        { questionId: single.id, optionIds: [single.options[0]?.id] },
        { questionId: scale.id, value: 1 },
      ]);
      const { value } = await reader.read();

      expect(decoder.decode(value)).toContain("event: response");
    } finally {
      abort.abort();
      server.closeAllConnections();
      server.close();
    }
  });
});
