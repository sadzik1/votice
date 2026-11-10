import type { QuestionDto, SurveyDetail, SurveySummary } from "@survey/shared";
import type { Option, Prisma, Question, Survey } from "../generated/prisma/client.js";

export const surveyDetailInclude = {
  questions: {
    orderBy: { position: "asc" },
    include: { options: { orderBy: { position: "asc" } } },
  },
  _count: { select: { responses: true } },
} satisfies Prisma.SurveyInclude;

export type SurveyWithDetail = Prisma.SurveyGetPayload<{ include: typeof surveyDetailInclude }>;

const iso = (date: Date | null): string | null => date?.toISOString() ?? null;

export function toQuestionDto(question: Question & { options: Option[] }): QuestionDto {
  return {
    id: question.id,
    position: question.position,
    type: question.type,
    title: question.title,
    required: question.required,
    scaleMin: question.scaleMin,
    scaleMax: question.scaleMax,
    options: question.options.map((o) => ({ id: o.id, label: o.label })),
  };
}

function baseFields(survey: Survey) {
  return {
    id: survey.id,
    slug: survey.slug,
    title: survey.title,
    status: survey.status,
    closesAt: iso(survey.closesAt),
    publishedAt: iso(survey.publishedAt),
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
  };
}

export function toSurveyDetail(survey: SurveyWithDetail): SurveyDetail {
  return {
    ...baseFields(survey),
    description: survey.description,
    responseCount: survey._count.responses,
    questions: survey.questions.map(toQuestionDto),
  };
}

export function toSurveySummary(
  survey: Survey & { _count: { responses: number; questions: number } },
): SurveySummary {
  return {
    ...baseFields(survey),
    questionCount: survey._count.questions,
    responseCount: survey._count.responses,
  };
}
