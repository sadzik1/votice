import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CSRF, db, makeApp, resetDb, sampleSurvey, signUp } from "./helpers.js";

const { app, events } = makeApp();

beforeEach(resetDb);
afterAll(() => db.$disconnect());

type Question = { id: string; options: { id: string }[] };

async function setup({ publish = true } = {}) {
  const owner = await signUp(app);
  const created = await owner.agent.post("/api/surveys").set(CSRF).send(sampleSurvey);
  const survey = created.body.survey as { id: string; slug: string; questions: Question[] };
  if (publish) {
    await owner.agent.post(`/api/surveys/${survey.id}/status`).set(CSRF).send({ status: "OPEN" });
  }
  const [single, multi, scale, text] = survey.questions as [Question, Question, Question, Question];
  const validAnswers = [
    { questionId: single.id, optionIds: [single.options[0]?.id] },
    { questionId: multi.id, optionIds: [multi.options[0]?.id, multi.options[2]?.id] },
    { questionId: scale.id, value: 4 },
    { questionId: text.id, text: "Ship smaller PRs" },
  ];
  return { owner, survey, single, scale, validAnswers };
}

const submit = (agent: ReturnType<typeof request.agent>, slug: string, answers: unknown[]) =>
  agent.post(`/api/public/surveys/${slug}/responses`).set(CSRF).send({ answers });

describe("GET /api/public/surveys/:slug", () => {
  it("shows a published survey to anyone without owner data", async () => {
    const { survey } = await setup();
    const res = await request(app).get(`/api/public/surveys/${survey.slug}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accepting: true, alreadyResponded: false });
    expect(res.body.survey.questions).toHaveLength(4);
    expect(res.body.survey).not.toHaveProperty("id");
    expect(JSON.stringify(res.body)).not.toContain("ownerId");
  });

  it("hides drafts", async () => {
    const { survey } = await setup({ publish: false });
    expect((await request(app).get(`/api/public/surveys/${survey.slug}`)).status).toBe(404);
  });
});

describe("POST /api/public/surveys/:slug/responses", () => {
  it("stores one answer row per selected option and notifies listeners", async () => {
    const { survey, validAnswers } = await setup();
    const received: string[] = [];
    const unsubscribe = events.subscribe(survey.id, (e) => received.push(e.surveyId));

    const res = await submit(request.agent(app), survey.slug, validAnswers);
    unsubscribe();

    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/^rid=.*HttpOnly/);
    expect(await db.response.count()).toBe(1);
    // single (1) + multi (2) + scale (1) + text (1)
    expect(await db.answer.count()).toBe(5);
    expect(received).toEqual([survey.id]);
  });

  it("allows only one response per browser", async () => {
    const { survey, validAnswers } = await setup();
    const respondent = request.agent(app);

    await submit(respondent, survey.slug, validAnswers);
    const second = await submit(respondent, survey.slug, validAnswers);
    const page = await respondent.get(`/api/public/surveys/${survey.slug}`);

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("ALREADY_RESPONDED");
    expect(page.body.alreadyResponded).toBe(true);
    expect(await db.response.count()).toBe(1);
  });

  it("returns per-question errors for invalid answers", async () => {
    const { survey, single, scale } = await setup();

    const res = await submit(request.agent(app), survey.slug, [
      { questionId: single.id, optionIds: ["not-an-option"] },
    ]);

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual({
      [`answers.${single.id}`]: ["Unknown option"],
      [`answers.${scale.id}`]: ["This question is required"],
    });
    expect(await db.response.count()).toBe(0);
  });

  it("rejects answers after the survey is closed or past its deadline", async () => {
    const { owner, survey, validAnswers } = await setup();

    await db.survey.update({
      where: { id: survey.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });
    const late = await submit(request.agent(app), survey.slug, validAnswers);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("SURVEY_CLOSED");

    await db.survey.update({ where: { id: survey.id }, data: { closesAt: null } });
    await owner.agent.post(`/api/surveys/${survey.id}/status`).set(CSRF).send({ status: "CLOSED" });
    const closed = await submit(request.agent(app), survey.slug, validAnswers);
    expect(closed.status).toBe(409);
  });
});
