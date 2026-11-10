import {
  canTransition,
  type ParsedSurvey,
  type SurveyDetail,
  type SurveyStatus,
  type SurveySummary,
} from "@survey/shared";
import type { Db } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { badRequest, conflict, HttpError, notFound } from "../lib/http-error.js";
import { randomSlug } from "../lib/tokens.js";
import { surveyDetailInclude, toSurveyDetail, toSurveySummary } from "./mappers.js";

type Tx = Prisma.TransactionClient;

const surveyNotFound = () => notFound("Survey not found");

function questionsCreateData(
  questions: ParsedSurvey["questions"],
): Prisma.QuestionCreateWithoutSurveyInput[] {
  return questions.map((q, position) => ({
    position,
    type: q.type,
    title: q.title,
    required: q.required,
    scaleMin: q.type === "SCALE" ? q.scaleMin : null,
    scaleMax: q.type === "SCALE" ? q.scaleMax : null,
    options:
      q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE"
        ? { create: q.options.map((o, i) => ({ position: i, label: o.label })) }
        : undefined,
  }));
}

function contentData(input: ParsedSurvey) {
  return {
    title: input.title,
    description: input.description || null,
    closesAt: input.closesAt ? new Date(input.closesAt) : null,
  };
}

// row lock so autosave and publish can't interleave;
// someone else's survey is a 404, not a 403
async function lockOwnedSurvey(tx: Tx, ownerId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM "Survey" WHERE id = ${id} FOR UPDATE`;
  const survey = await tx.survey.findFirst({ where: { id, ownerId } });
  if (!survey) throw surveyNotFound();
  return survey;
}

export async function listSurveys(db: Db, ownerId: string): Promise<SurveySummary[]> {
  const surveys = await db.survey.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { responses: true, questions: true } } },
  });
  return surveys.map(toSurveySummary);
}

export async function getSurvey(db: Db, ownerId: string, id: string): Promise<SurveyDetail> {
  const survey = await db.survey.findFirst({
    where: { id, ownerId },
    include: surveyDetailInclude,
  });
  if (!survey) throw surveyNotFound();
  return toSurveyDetail(survey);
}

export async function createSurvey(
  db: Db,
  ownerId: string,
  input: ParsedSurvey,
): Promise<SurveyDetail> {
  const survey = await db.survey.create({
    data: {
      ...contentData(input),
      slug: randomSlug(),
      ownerId,
      questions: { create: questionsCreateData(input.questions) },
    },
    include: surveyDetailInclude,
  });
  return toSurveyDetail(survey);
}

// the builder always sends the full survey, so just replace the questions
export async function replaceSurvey(
  db: Db,
  ownerId: string,
  id: string,
  input: ParsedSurvey,
): Promise<SurveyDetail> {
  return db.$transaction(async (tx) => {
    const survey = await lockOwnedSurvey(tx, ownerId, id);
    if (survey.status !== "DRAFT") {
      throw new HttpError(409, "NOT_EDITABLE", "Only draft surveys can be edited");
    }

    const updated = await tx.survey.update({
      where: { id },
      data: {
        ...contentData(input),
        questions: { deleteMany: {}, create: questionsCreateData(input.questions) },
      },
      include: surveyDetailInclude,
    });
    return toSurveyDetail(updated);
  });
}

export async function deleteSurvey(db: Db, ownerId: string, id: string): Promise<void> {
  const { count } = await db.survey.deleteMany({ where: { id, ownerId } });
  if (count === 0) throw surveyNotFound();
}

export async function changeStatus(
  db: Db,
  ownerId: string,
  id: string,
  to: SurveyStatus,
  now: Date = new Date(),
): Promise<SurveyDetail> {
  return db.$transaction(async (tx) => {
    const survey = await lockOwnedSurvey(tx, ownerId, id);

    if (!canTransition(survey.status, to)) {
      throw conflict(`A ${survey.status.toLowerCase()} survey cannot become ${to.toLowerCase()}`);
    }
    if (survey.status === "DRAFT" && survey.closesAt && survey.closesAt <= now) {
      throw badRequest("The deadline is in the past. Change it before publishing.");
    }

    const data: Prisma.SurveyUpdateInput = { status: to };
    if (survey.status === "DRAFT") data.publishedAt = now;
    // otherwise reopening would close it again right away
    if (survey.status === "CLOSED" && survey.closesAt && survey.closesAt <= now) {
      data.closesAt = null;
    }

    const updated = await tx.survey.update({ where: { id }, data, include: surveyDetailInclude });
    return toSurveyDetail(updated);
  });
}
