import type { SurveyDetail } from "@survey/shared";
import { describe, expect, it } from "vitest";
import {
  type BuilderState,
  changeQuestionType,
  duplicateQuestion,
  fromSurvey,
  newQuestion,
  toSurveyInput,
  validateBuilder,
} from "./builder-state.ts";

const state = (overrides: Partial<BuilderState> = {}): BuilderState => ({
  title: "Poll",
  description: "",
  closesAt: "",
  questions: [{ ...newQuestion("SINGLE_CHOICE"), title: "Pick one" }],
  ...overrides,
});

describe("toSurveyInput", () => {
  it("sends only the fields that belong to each question type", () => {
    const input = toSurveyInput(
      state({
        questions: [
          { ...newQuestion("TEXT"), title: "Why?" },
          { ...newQuestion("SCALE"), title: "Rate", scaleMin: 0, scaleMax: 10 },
        ],
      }),
    );

    expect(input.questions).toEqual([
      { type: "TEXT", title: "Why?", required: true },
      { type: "SCALE", title: "Rate", required: true, scaleMin: 0, scaleMax: 10 },
    ]);
    expect(input.closesAt).toBeNull();
    expect(input.description).toBeUndefined();
  });

  it("round-trips a survey from the API", () => {
    const detail: SurveyDetail = {
      id: "s1",
      slug: "abc",
      title: "Retro",
      description: "Notes",
      status: "DRAFT",
      closesAt: "2030-01-01T10:00:00.000Z",
      publishedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      responseCount: 0,
      questions: [
        {
          id: "q1",
          position: 0,
          type: "MULTIPLE_CHOICE",
          title: "Tags",
          required: false,
          scaleMin: null,
          scaleMax: null,
          options: [
            { id: "o1", label: "A" },
            { id: "o2", label: "B" },
          ],
        },
      ],
    };

    const input = toSurveyInput(fromSurvey(detail));

    expect(input).toEqual({
      title: "Retro",
      description: "Notes",
      closesAt: "2030-01-01T10:00:00.000Z",
      questions: [
        {
          type: "MULTIPLE_CHOICE",
          title: "Tags",
          required: false,
          options: [{ label: "A" }, { label: "B" }],
        },
      ],
    });
  });
});

describe("question helpers", () => {
  it("keeps options when switching to text and back", () => {
    const original = { ...newQuestion("SINGLE_CHOICE"), title: "Q" };
    const roundTrip = changeQuestionType(changeQuestionType(original, "TEXT"), "MULTIPLE_CHOICE");
    expect(roundTrip.options.map((o) => o.label)).toEqual(["Option 1", "Option 2"]);
  });

  it("adds options when a question without them becomes a choice question", () => {
    const empty = { ...newQuestion("TEXT"), options: [] };
    expect(changeQuestionType(empty, "SINGLE_CHOICE").options).toHaveLength(2);
  });

  it("gives a duplicate fresh keys", () => {
    const original = newQuestion();
    const copy = duplicateQuestion(original);
    expect(copy.key).not.toBe(original.key);
    expect(copy.options[0]?.key).not.toBe(original.options[0]?.key);
  });
});

describe("validateBuilder", () => {
  it("reports errors by field path", () => {
    const errors = validateBuilder(
      state({
        title: "",
        questions: [{ ...newQuestion("SINGLE_CHOICE"), title: "", options: [] }],
      }),
    );
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["title", "questions.0.title", "questions.0.options"]),
    );
  });

  it("passes a valid survey", () => {
    expect(validateBuilder(state())).toEqual({});
  });
});
