// dates are ISO strings
import type { SurveyStatus } from "./status.js";
import type { QuestionType } from "./survey.js";

export type OptionDto = {
  id: string;
  label: string;
};

export type QuestionDto = {
  id: string;
  position: number;
  type: QuestionType;
  title: string;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  options: OptionDto[];
};

export type SurveySummary = {
  id: string;
  slug: string;
  title: string;
  status: SurveyStatus;
  closesAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  responseCount: number;
};

export type SurveyDetail = Omit<SurveySummary, "questionCount"> & {
  description: string | null;
  questions: QuestionDto[];
};

export type PublicSurvey = {
  slug: string;
  title: string;
  description: string | null;
  closesAt: string | null;
  questions: QuestionDto[];
};

export type PublicSurveyResponse = {
  survey: PublicSurvey;
  accepting: boolean;
  alreadyResponded: boolean;
};

export type ChoiceQuestionResults = {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
  options: (OptionDto & { count: number })[];
};

export type ScaleQuestionResults = {
  type: "SCALE";
  scaleMin: number;
  scaleMax: number;
  distribution: { value: number; count: number }[];
  average: number | null;
};

export type TextQuestionResults = {
  type: "TEXT";
};

export type QuestionResults = {
  id: string;
  title: string;
  required: boolean;
  answered: number;
} & (ChoiceQuestionResults | ScaleQuestionResults | TextQuestionResults);

export type SurveyResults = {
  survey: Pick<SurveyDetail, "id" | "slug" | "title" | "status" | "closesAt">;
  totalResponses: number;
  lastResponseAt: string | null;
  questions: QuestionResults[];
};

export type TextAnswer = {
  id: string;
  text: string;
  createdAt: string;
};

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
};
