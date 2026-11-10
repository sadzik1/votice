import type { Page, QuestionResults, SurveyResults, TextAnswer } from "@survey/shared";
import type { Db } from "../db.js";
import { toCsv } from "../lib/csv.js";
import { notFound } from "../lib/http-error.js";

async function findOwnedSurvey(db: Db, ownerId: string, id: string) {
  const survey = await db.survey.findFirst({
    where: { id, ownerId },
    include: {
      questions: {
        orderBy: { position: "asc" },
        include: { options: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!survey) throw notFound("Survey not found");
  return survey;
}

export async function assertOwnsSurvey(db: Db, ownerId: string, id: string): Promise<void> {
  const count = await db.survey.count({ where: { id, ownerId } });
  if (count === 0) throw notFound("Survey not found");
}

export async function getResults(db: Db, ownerId: string, id: string): Promise<SurveyResults> {
  const survey = await findOwnedSurvey(db, ownerId, id);
  const inSurvey = { question: { surveyId: id } };

  const [totalResponses, lastResponse, optionCounts, scaleCounts, answeredRows] = await Promise.all(
    [
      db.response.count({ where: { surveyId: id } }),
      db.response.findFirst({
        where: { surveyId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.answer.groupBy({
        by: ["optionId"],
        where: { ...inSurvey, optionId: { not: null } },
        _count: { _all: true },
      }),
      db.answer.groupBy({
        by: ["questionId", "value"],
        where: { ...inSurvey, value: { not: null } },
        _count: { _all: true },
      }),
      // multiple choice = several rows per response
      db.$queryRaw<{ questionId: string; answered: bigint }[]>`
      SELECT a."questionId", COUNT(DISTINCT a."responseId") AS answered
      FROM "Answer" a
      JOIN "Question" q ON q.id = a."questionId"
      WHERE q."surveyId" = ${id}
      GROUP BY a."questionId"`,
    ],
  );

  const byOption = new Map(optionCounts.map((r) => [r.optionId, r._count._all]));
  const byScaleValue = new Map(
    scaleCounts.map((r) => [`${r.questionId}:${r.value}`, r._count._all]),
  );
  const answered = new Map(answeredRows.map((r) => [r.questionId, Number(r.answered)]));

  const questions = survey.questions.map((q): QuestionResults => {
    const base = {
      id: q.id,
      title: q.title,
      required: q.required,
      answered: answered.get(q.id) ?? 0,
    };

    if (q.type === "TEXT") return { ...base, type: "TEXT" };

    if (q.type === "SCALE") {
      const scaleMin = q.scaleMin ?? 1;
      const scaleMax = q.scaleMax ?? 5;
      const distribution = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => {
        const value = scaleMin + i;
        return { value, count: byScaleValue.get(`${q.id}:${value}`) ?? 0 };
      });
      const count = distribution.reduce((sum, d) => sum + d.count, 0);
      const total = distribution.reduce((sum, d) => sum + d.value * d.count, 0);
      const average = count > 0 ? Math.round((total / count) * 100) / 100 : null;
      return { ...base, type: "SCALE", scaleMin, scaleMax, distribution, average };
    }

    return {
      ...base,
      type: q.type,
      options: q.options.map((o) => ({ id: o.id, label: o.label, count: byOption.get(o.id) ?? 0 })),
    };
  });

  return {
    survey: {
      id: survey.id,
      slug: survey.slug,
      title: survey.title,
      status: survey.status,
      closesAt: survey.closesAt?.toISOString() ?? null,
    },
    totalResponses,
    lastResponseAt: lastResponse?.createdAt.toISOString() ?? null,
    questions,
  };
}

// cuid v1 ids are roughly time-ordered
export async function listTextAnswers(
  db: Db,
  ownerId: string,
  surveyId: string,
  questionId: string,
  { cursor, limit }: { cursor?: string; limit: number },
): Promise<Page<TextAnswer>> {
  const question = await db.question.findFirst({
    where: { id: questionId, surveyId, survey: { ownerId } },
    select: { id: true },
  });
  if (!question) throw notFound("Question not found");

  const rows = await db.answer.findMany({
    where: { questionId, text: { not: null } },
    orderBy: { id: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: { id: true, text: true, response: { select: { createdAt: true } } },
  });

  const items = rows.slice(0, limit);
  return {
    items: items.map((r) => ({
      id: r.id,
      text: r.text ?? "",
      createdAt: r.response.createdAt.toISOString(),
    })),
    nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null,
  };
}

export async function exportCsv(
  db: Db,
  ownerId: string,
  id: string,
): Promise<{ filename: string; csv: string }> {
  const survey = await findOwnedSurvey(db, ownerId, id);
  const responses = await db.response.findMany({
    where: { surveyId: id },
    orderBy: { createdAt: "asc" },
    include: { answers: { include: { option: { select: { label: true, position: true } } } } },
  });

  const header = ["Submitted at", ...survey.questions.map((q) => q.title)];
  const rows = responses.map((response) => {
    const cells = survey.questions.map((q) => {
      const answers = response.answers.filter((a) => a.questionId === q.id);
      if (q.type === "TEXT") return answers[0]?.text ?? "";
      if (q.type === "SCALE") return answers[0]?.value?.toString() ?? "";
      return answers
        .flatMap((a) => (a.option ? [a.option] : []))
        .sort((a, b) => a.position - b.position)
        .map((o) => o.label)
        .join("; ");
    });
    return [response.createdAt.toISOString(), ...cells];
  });

  return { filename: `${survey.title} - responses.csv`, csv: toCsv([header, ...rows]) };
}
