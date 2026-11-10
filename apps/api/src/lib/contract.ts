import type { QuestionType, SurveyStatus } from "@survey/shared";
import type {
  QuestionType as DbQuestionType,
  SurveyStatus as DbSurveyStatus,
} from "../generated/prisma/enums.js";

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

// typecheck fails if the prisma enums and the shared enums drift apart
export type ContractChecks = [
  Assert<Equals<SurveyStatus, DbSurveyStatus>>,
  Assert<Equals<QuestionType, DbQuestionType>>,
];
