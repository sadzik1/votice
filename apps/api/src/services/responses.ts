import {
  isAcceptingResponses,
  type PublicSurvey,
  type PublicSurveyResponse,
  type ResponseInput,
  validateResponse,
} from "@survey/shared";
import type { Db } from "../db.js";
import type { Prisma } from "../generated/prisma/client.js";
import { HttpError, notFound, validationError } from "../lib/http-error.js";
import { isUniqueViolation } from "../lib/prisma-errors.js";
import { sha256 } from "../lib/tokens.js";
import { type SurveyWithDetail, surveyDetailInclude, toQuestionDto } from "./mappers.js";

function toPublicSurvey(survey: SurveyWithDetail): PublicSurvey {
  return {
    slug: survey.slug,
    title: survey.title,
    description: survey.description,
    closesAt: survey.closesAt?.toISOString() ?? null,
    questions: survey.questions.map(toQuestionDto),
  };
}

// drafts are a 404 for the public
async function findPublishedSurvey(db: Db, slug: string) {
  const survey = await db.survey.findFirst({
    where: { slug, status: { not: "DRAFT" } },
    include: surveyDetailInclude,
  });
  if (!survey) throw notFound("Survey not found");
  return survey;
}

// one response per browser (cookie), not a real identity check
export const respondentKey = (respondentId: string) => sha256(respondentId);

export async function getPublicSurvey(
  db: Db,
  slug: string,
  respondentId: string | undefined,
): Promise<PublicSurveyResponse> {
  const survey = await findPublishedSurvey(db, slug);
  const alreadyResponded = respondentId
    ? (await db.response.count({
        where: { surveyId: survey.id, respondentKey: respondentKey(respondentId) },
      })) > 0
    : false;

  return {
    survey: toPublicSurvey(survey),
    accepting: isAcceptingResponses(survey),
    alreadyResponded,
  };
}

export async function submitResponse(
  db: Db,
  slug: string,
  respondentId: string,
  input: ResponseInput,
): Promise<{ surveyId: string }> {
  const survey = await findPublishedSurvey(db, slug);
  if (!isAcceptingResponses(survey)) {
    throw new HttpError(409, "SURVEY_CLOSED", "This survey is no longer accepting answers");
  }

  const result = validateResponse(survey.questions, input.answers);
  if (!result.ok) {
    const fields = Object.fromEntries(
      Object.entries(result.errors).map(([questionId, message]) => [
        `answers.${questionId}`,
        [message],
      ]),
    );
    throw validationError("Some answers need attention", fields);
  }

  const rows = result.answers.flatMap<Prisma.AnswerUncheckedCreateWithoutResponseInput>((answer) =>
    answer.optionIds
      ? answer.optionIds.map((optionId) => ({ questionId: answer.questionId, optionId }))
      : [{ questionId: answer.questionId, text: answer.text ?? null, value: answer.value ?? null }],
  );

  try {
    await db.response.create({
      data: {
        surveyId: survey.id,
        respondentKey: respondentKey(respondentId),
        answers: { create: rows },
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "ALREADY_RESPONDED", "You have already answered this survey");
    }
    throw error;
  }

  return { surveyId: survey.id };
}
