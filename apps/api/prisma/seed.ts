// npm run db:seed (re-creates the demo user every time)
import { existsSync } from "node:fs";
import { createDb, poolMaxFromEnv } from "../src/db.js";
import { hashPassword } from "../src/lib/password.js";
import { randomSlug } from "../src/lib/tokens.js";

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export const DEMO_USER = {
  name: "Demo User",
  email: "demo@example.com",
  password: "demo-password",
};

const db = createDb(url, { poolMax: poolMaxFromEnv() });

// deterministic so the demo data is the same on every run
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = prng(42);

function weighted<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (const [i, item] of items.entries()) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return item;
  }
  return items[items.length - 1] as T;
}

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

type QuestionSeed =
  | {
      type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
      title: string;
      required?: boolean;
      options: string[];
    }
  | { type: "SCALE"; title: string; required?: boolean; scaleMin: number; scaleMax: number }
  | { type: "TEXT"; title: string; required?: boolean };

async function createSurvey(
  ownerId: string,
  data: {
    title: string;
    description?: string;
    status: "DRAFT" | "OPEN" | "CLOSED";
    publishedDaysAgo?: number;
    questions: QuestionSeed[];
  },
) {
  return db.survey.create({
    data: {
      ownerId,
      slug: randomSlug(),
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      publishedAt: data.publishedDaysAgo === undefined ? null : daysAgo(data.publishedDaysAgo),
      createdAt: daysAgo((data.publishedDaysAgo ?? 0) + 1),
      questions: {
        create: data.questions.map((q, position) => ({
          position,
          type: q.type,
          title: q.title,
          required: q.required ?? true,
          scaleMin: q.type === "SCALE" ? q.scaleMin : null,
          scaleMax: q.type === "SCALE" ? q.scaleMax : null,
          options:
            q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE"
              ? { create: q.options.map((label, i) => ({ position: i, label })) }
              : undefined,
        })),
      },
    },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
      },
    },
  });
}

type CreatedSurvey = Awaited<ReturnType<typeof createSurvey>>;
type AnswerRow = { questionId: string; optionId?: string; text?: string; value?: number };

async function addResponses(
  survey: CreatedSurvey,
  count: number,
  spreadDays: number,
  answer: (q: CreatedSurvey["questions"][number]) => AnswerRow[],
) {
  for (let i = 0; i < count; i++) {
    await db.response.create({
      data: {
        surveyId: survey.id,
        respondentKey: `seed-${survey.id}-${i}`,
        createdAt: new Date(Date.now() - random() * spreadDays * DAY),
        answers: { create: survey.questions.flatMap(answer) },
      },
    });
  }
}

const RETRO_COMMENTS = [
  "Fewer meetings, more focus time please.",
  "Code reviews were much faster this sprint.",
  "The release went smoothly, great job everyone!",
  "We should split big tickets earlier.",
  "Pairing on the payment bug really helped.",
  "Docs are still behind. Let's reserve time for them.",
  "Standups ran long a few times.",
];

const ONBOARDING_COMMENTS = [
  "The setup wizard was clear.",
  "I got lost on the billing page.",
  "Would love a video walkthrough.",
  "Importing data took too long.",
  "Everything just worked. Nice!",
];

async function main() {
  await db.user.deleteMany({ where: { email: DEMO_USER.email } });
  const user = await db.user.create({
    data: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      passwordHash: await hashPassword(DEMO_USER.password),
    },
  });

  const retro = await createSurvey(user.id, {
    title: "Sprint 42 retrospective",
    description: "Anonymous. Takes about a minute.",
    status: "OPEN",
    publishedDaysAgo: 9,
    questions: [
      {
        type: "SINGLE_CHOICE",
        title: "How did the sprint feel?",
        options: ["Great", "Good", "Okay", "Rough"],
      },
      {
        type: "MULTIPLE_CHOICE",
        title: "What went well?",
        required: false,
        options: ["Planning", "Code reviews", "Releases", "Pairing", "Documentation"],
      },
      { type: "SCALE", title: "How productive were you?", scaleMin: 1, scaleMax: 5 },
      { type: "TEXT", title: "What should we change next sprint?", required: false },
    ],
  });
  await addResponses(retro, 48, 9, (q) => {
    if (q.type === "SINGLE_CHOICE") {
      const option = weighted(q.options, [5, 9, 4, 2]);
      return [{ questionId: q.id, optionId: option.id }];
    }
    if (q.type === "MULTIPLE_CHOICE") {
      const weights = [0.5, 0.7, 0.4, 0.3, 0.15];
      return q.options
        .filter((_, i) => random() < (weights[i] ?? 0))
        .map((o) => ({ questionId: q.id, optionId: o.id }));
    }
    if (q.type === "SCALE")
      return [{ questionId: q.id, value: weighted([1, 2, 3, 4, 5], [1, 2, 6, 9, 5]) }];
    return random() < 0.45
      ? [
          {
            questionId: q.id,
            text: RETRO_COMMENTS[Math.floor(random() * RETRO_COMMENTS.length)] ?? "",
          },
        ]
      : [];
  });

  const onboarding = await createSurvey(user.id, {
    title: "Onboarding feedback",
    status: "CLOSED",
    publishedDaysAgo: 30,
    questions: [
      {
        type: "SINGLE_CHOICE",
        title: "How did you hear about us?",
        options: ["Search", "A friend", "Social media", "Conference"],
      },
      {
        type: "SCALE",
        title: "How likely are you to recommend us to a friend?",
        scaleMin: 0,
        scaleMax: 10,
      },
      { type: "TEXT", title: "What almost stopped you from signing up?", required: false },
    ],
  });
  await addResponses(onboarding, 26, 30, (q) => {
    if (q.type === "SINGLE_CHOICE") {
      return [{ questionId: q.id, optionId: weighted(q.options, [8, 5, 6, 2]).id }];
    }
    if (q.type === "SCALE") {
      return [{ questionId: q.id, value: weighted([5, 6, 7, 8, 9, 10], [1, 2, 4, 6, 5, 4]) }];
    }
    return random() < 0.5
      ? [
          {
            questionId: q.id,
            text: ONBOARDING_COMMENTS[Math.floor(random() * ONBOARDING_COMMENTS.length)] ?? "",
          },
        ]
      : [];
  });

  await createSurvey(user.id, {
    title: "Team lunch on Friday",
    status: "DRAFT",
    questions: [
      {
        type: "SINGLE_CHOICE",
        title: "Where should we go?",
        options: ["Pizza place", "Ramen bar", "Salad spot"],
      },
      { type: "TEXT", title: "Any dietary restrictions?", required: false },
    ],
  });

  console.log(`Seeded demo account: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
