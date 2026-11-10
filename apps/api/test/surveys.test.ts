import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CSRF, db, makeApp, resetDb, sampleSurvey, signUp } from "./helpers.js";

const { app } = makeApp();

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function createSurvey(agent: Awaited<ReturnType<typeof signUp>>["agent"]) {
  const res = await agent.post("/api/surveys").set(CSRF).send(sampleSurvey);
  expect(res.status).toBe(201);
  return res.body.survey;
}

describe("surveys CRUD", () => {
  it("requires a session", async () => {
    expect((await request(app).get("/api/surveys")).status).toBe(401);
  });

  it("creates a draft with ordered questions and options", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);

    expect(survey).toMatchObject({
      title: "Team retro",
      status: "DRAFT",
      responseCount: 0,
      slug: expect.stringMatching(/^[\w-]{11}$/),
    });
    expect(survey.questions.map((q: { type: string }) => q.type)).toEqual([
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "SCALE",
      "TEXT",
    ]);
    expect(survey.questions[0].options.map((o: { label: string }) => o.label)).toEqual([
      "Great",
      "Okay",
      "Bad",
    ]);
    expect(survey.questions[2]).toMatchObject({ scaleMin: 1, scaleMax: 5, options: [] });
  });

  it("lists only the current user's surveys", async () => {
    const ann = await signUp(app);
    const bob = await signUp(app);
    await createSurvey(ann.agent);

    const annList = await ann.agent.get("/api/surveys");
    const bobList = await bob.agent.get("/api/surveys");

    expect(annList.body.surveys).toHaveLength(1);
    expect(annList.body.surveys[0]).toMatchObject({ questionCount: 4, responseCount: 0 });
    expect(bobList.body.surveys).toEqual([]);
  });

  it("hides other users' surveys behind 404 for every operation", async () => {
    const ann = await signUp(app);
    const bob = await signUp(app);
    const survey = await createSurvey(ann.agent);
    const url = `/api/surveys/${survey.id}`;

    expect((await bob.agent.get(url)).status).toBe(404);
    expect((await bob.agent.put(url).set(CSRF).send(sampleSurvey)).status).toBe(404);
    expect((await bob.agent.delete(url).set(CSRF)).status).toBe(404);
    expect((await bob.agent.post(`${url}/status`).set(CSRF).send({ status: "OPEN" })).status).toBe(
      404,
    );
    expect((await ann.agent.get(url)).status).toBe(200);
  });

  it("replaces the content of a draft", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);

    const res = await agent
      .put(`/api/surveys/${survey.id}`)
      .set(CSRF)
      .send({ title: "Renamed", questions: [{ type: "TEXT", title: "Only question" }] });

    expect(res.status).toBe(200);
    expect(res.body.survey.title).toBe("Renamed");
    expect(res.body.survey.questions).toHaveLength(1);
    expect(await db.option.count()).toBe(0);
  });

  it("validates the body", async () => {
    const { agent } = await signUp(app);
    const res = await agent.post("/api/surveys").set(CSRF).send({ title: "", questions: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty("title");
    expect(res.body.error.fields).toHaveProperty("questions");
  });

  it("deletes a survey with everything inside it", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);

    expect((await agent.delete(`/api/surveys/${survey.id}`).set(CSRF)).status).toBe(204);
    expect(await db.question.count()).toBe(0);
    expect((await agent.get(`/api/surveys/${survey.id}`)).status).toBe(404);
  });
});

describe("POST /api/surveys/:id/status", () => {
  it("publishes a draft and then locks its content", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);

    const res = await agent
      .post(`/api/surveys/${survey.id}/status`)
      .set(CSRF)
      .send({ status: "OPEN" });
    expect(res.status).toBe(200);
    expect(res.body.survey.status).toBe("OPEN");
    expect(res.body.survey.publishedAt).toEqual(expect.any(String));

    const edit = await agent.put(`/api/surveys/${survey.id}`).set(CSRF).send(sampleSurvey);
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe("NOT_EDITABLE");
  });

  it("rejects transitions that the state machine does not allow", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);

    const res = await agent
      .post(`/api/surveys/${survey.id}/status`)
      .set(CSRF)
      .send({ status: "CLOSED" });
    expect(res.status).toBe(409);
  });

  it("refuses to publish with a deadline in the past", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);
    await db.survey.update({
      where: { id: survey.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });

    const res = await agent
      .post(`/api/surveys/${survey.id}/status`)
      .set(CSRF)
      .send({ status: "OPEN" });
    expect(res.status).toBe(400);
  });

  it("drops an expired deadline when a closed survey is reopened", async () => {
    const { agent } = await signUp(app);
    const survey = await createSurvey(agent);
    const statusUrl = `/api/surveys/${survey.id}/status`;
    await agent.post(statusUrl).set(CSRF).send({ status: "OPEN" });
    await agent.post(statusUrl).set(CSRF).send({ status: "CLOSED" });
    await db.survey.update({
      where: { id: survey.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });

    const res = await agent.post(statusUrl).set(CSRF).send({ status: "OPEN" });

    expect(res.status).toBe(200);
    expect(res.body.survey).toMatchObject({ status: "OPEN", closesAt: null });
  });
});
