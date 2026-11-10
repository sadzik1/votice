// keep in sync with the prisma enum (checked in api/src/lib/contract.ts)
export const SURVEY_STATUSES = ["DRAFT", "OPEN", "CLOSED"] as const;
export type SurveyStatus = (typeof SURVEY_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<SurveyStatus, readonly SurveyStatus[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: ["OPEN"],
};

export function canTransition(from: SurveyStatus, to: SurveyStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isAcceptingResponses(
  survey: { status: SurveyStatus; closesAt: Date | null },
  now: Date = new Date(),
): boolean {
  if (survey.status !== "OPEN") return false;
  return survey.closesAt === null || survey.closesAt > now;
}
