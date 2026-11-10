import {
  type QuestionType,
  type SurveyDetail,
  type SurveyInput,
  surveyInputSchema,
} from "@survey/shared";
import { type FieldErrors, issuesToFieldErrors } from "../../lib/errors.ts";

// every question keeps both options and scale settings, so switching the type
// back and forth doesn't lose input. toSurveyInput drops what the type doesn't use.

export type BuilderOption = { key: string; label: string };

export type BuilderQuestion = {
  key: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options: BuilderOption[];
  scaleMin: number;
  scaleMax: number;
};

export type BuilderState = {
  title: string;
  description: string;
  closesAt: string;
  questions: BuilderQuestion[];
};

export const newKey = (): string => crypto.randomUUID();

export const isChoice = (type: QuestionType): boolean =>
  type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE";

export function newOption(label = ""): BuilderOption {
  return { key: newKey(), label };
}

export function newQuestion(type: QuestionType = "SINGLE_CHOICE"): BuilderQuestion {
  return {
    key: newKey(),
    type,
    title: "",
    required: true,
    options: [newOption("Option 1"), newOption("Option 2")],
    scaleMin: 1,
    scaleMax: 5,
  };
}

export function blankSurveyInput(): SurveyInput {
  return {
    title: "Untitled survey",
    questions: [
      {
        type: "SINGLE_CHOICE",
        title: "Untitled question",
        options: [{ label: "Option 1" }, { label: "Option 2" }],
      },
    ],
  };
}

export function changeQuestionType(question: BuilderQuestion, type: QuestionType): BuilderQuestion {
  const options =
    isChoice(type) && question.options.length < 2
      ? [
          ...question.options,
          ...[1, 2].slice(question.options.length).map((n) => newOption(`Option ${n}`)),
        ]
      : question.options;
  return { ...question, type, options };
}

export function duplicateQuestion(question: BuilderQuestion): BuilderQuestion {
  return {
    ...question,
    key: newKey(),
    title: question.title ? `${question.title} (copy)` : "",
    options: question.options.map((o) => newOption(o.label)),
  };
}

export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromSurvey(survey: SurveyDetail): BuilderState {
  return {
    title: survey.title,
    description: survey.description ?? "",
    closesAt: isoToLocalInput(survey.closesAt),
    questions: survey.questions.map((q) => ({
      key: q.id,
      type: q.type,
      title: q.title,
      required: q.required,
      options: q.options.map((o) => ({ key: o.id, label: o.label })),
      scaleMin: q.scaleMin ?? 1,
      scaleMax: q.scaleMax ?? 5,
    })),
  };
}

export function toSurveyInput(state: BuilderState): SurveyInput {
  return {
    title: state.title,
    description: state.description.trim() || undefined,
    // datetime-local has no timezone, Date() treats it as local
    closesAt: state.closesAt ? new Date(state.closesAt).toISOString() : null,
    questions: state.questions.map((q) => {
      const base = { title: q.title, required: q.required };
      if (q.type === "TEXT") return { ...base, type: "TEXT" };
      if (q.type === "SCALE") {
        return { ...base, type: "SCALE", scaleMin: q.scaleMin, scaleMax: q.scaleMax };
      }
      return { ...base, type: q.type, options: q.options.map((o) => ({ label: o.label })) };
    }),
  };
}

export function validateBuilder(state: BuilderState): FieldErrors {
  const result = surveyInputSchema.safeParse(toSurveyInput(state));
  return result.success ? {} : issuesToFieldErrors(result.error.issues);
}
