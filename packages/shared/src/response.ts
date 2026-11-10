import type { QuestionDto } from "./dto.js";
import { type AnswerInput, LIMITS } from "./survey.js";

export type QuestionShape = Pick<
  QuestionDto,
  "id" | "type" | "required" | "scaleMin" | "scaleMax"
> & {
  options: { id: string }[];
};

export type NormalizedAnswer = {
  questionId: string;
  optionIds?: string[];
  text?: string;
  value?: number;
};

export type ResponseValidation =
  | { ok: true; answers: NormalizedAnswer[] }
  // keyed by question id, `_form` for general errors
  | { ok: false; errors: Record<string, string> };

export const REQUIRED_MESSAGE = "This question is required";

// runs in the browser for instant feedback and again on the server
export function validateResponse(
  questions: readonly QuestionShape[],
  answers: readonly AnswerInput[],
): ResponseValidation {
  const errors: Record<string, string> = {};
  const known = new Set(questions.map((q) => q.id));
  const byQuestion = new Map<string, AnswerInput>();

  for (const answer of answers) {
    if (!known.has(answer.questionId)) {
      errors._form = "The survey has changed. Reload the page and try again.";
    } else if (byQuestion.has(answer.questionId)) {
      errors[answer.questionId] = "This question was answered twice";
    } else {
      byQuestion.set(answer.questionId, answer);
    }
  }

  const normalized: NormalizedAnswer[] = [];

  for (const q of questions) {
    const answer = byQuestion.get(q.id);
    const fail = (message: string) => {
      errors[q.id] ??= message;
    };

    switch (q.type) {
      case "SINGLE_CHOICE":
      case "MULTIPLE_CHOICE": {
        const optionIds = [...new Set(answer?.optionIds ?? [])];
        if (optionIds.length === 0) {
          if (q.required) fail(REQUIRED_MESSAGE);
          break;
        }
        const valid = new Set(q.options.map((o) => o.id));
        if (optionIds.some((id) => !valid.has(id))) fail("Unknown option");
        else if (q.type === "SINGLE_CHOICE" && optionIds.length > 1) fail("Pick only one option");
        else normalized.push({ questionId: q.id, optionIds });
        break;
      }
      case "TEXT": {
        const text = answer?.text?.trim() ?? "";
        if (!text) {
          if (q.required) fail(REQUIRED_MESSAGE);
        } else if (text.length > LIMITS.textAnswerMax) {
          fail(`Keep it under ${LIMITS.textAnswerMax} characters`);
        } else {
          normalized.push({ questionId: q.id, text });
        }
        break;
      }
      case "SCALE": {
        const value = answer?.value;
        const min = q.scaleMin ?? 1;
        const max = q.scaleMax ?? 5;
        if (value === undefined) {
          if (q.required) fail(REQUIRED_MESSAGE);
        } else if (!Number.isInteger(value) || value < min || value > max) {
          fail(`Pick a value from ${min} to ${max}`);
        } else {
          normalized.push({ questionId: q.id, value });
        }
        break;
      }
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, answers: normalized };
}
