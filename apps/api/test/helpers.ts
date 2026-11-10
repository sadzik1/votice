import { existsSync } from "node:fs";
import type { SurveyInput } from "@survey/shared";
import request from "supertest";
import { type AppConfig, createApp } from "../src/app.js";
import { createDb, poolMaxFromEnv } from "../src/db.js";
import { SurveyEvents } from "../src/lib/events.js";

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is not set");

export const db = createDb(url, { poolMax: poolMaxFromEnv() });

export const CSRF = { "X-Requested-With": "fetch" } as const;

const testConfig: AppConfig = {
  secureCookies: false,
  trustProxy: false,
  rateLimits: {
    auth: { windowMs: 60_000, limit: 1000 },
    responses: { windowMs: 60_000, limit: 1000 },
  },
};

export function makeApp(overrides: Partial<AppConfig> = {}) {
  const events = new SurveyEvents();
  const app = createApp({ db, events, config: { ...testConfig, ...overrides } });
  return { app, events };
}

export async function resetDb(): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "Answer", "Response", "Option", "Question", "Survey", "Session", "User" CASCADE',
  );
}

let userCounter = 0;

export async function signUp(app: Parameters<typeof request.agent>[0]) {
  userCounter += 1;
  const agent = request.agent(app);
  const credentials = {
    name: `User ${userCounter}`,
    email: `user${userCounter}@example.com`,
    password: "password-123",
  };
  const res = await agent.post("/api/auth/register").set(CSRF).send(credentials);
  if (res.status !== 201)
    throw new Error(`signUp failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user as { id: string; email: string; name: string }, credentials };
}

export const sampleSurvey: SurveyInput = {
  title: "Team retro",
  description: "How did the sprint go?",
  questions: [
    {
      type: "SINGLE_CHOICE",
      title: "Overall mood",
      options: [{ label: "Great" }, { label: "Okay" }, { label: "Bad" }],
    },
    {
      type: "MULTIPLE_CHOICE",
      title: "What went well?",
      required: false,
      options: [{ label: "Planning" }, { label: "Reviews" }, { label: "Releases" }],
    },
    { type: "SCALE", title: "Rate the sprint", scaleMin: 1, scaleMax: 5 },
    { type: "TEXT", title: "Anything else?", required: false },
  ],
};
