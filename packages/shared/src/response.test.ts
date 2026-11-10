import { describe, expect, it } from "vitest";
import { type QuestionShape, REQUIRED_MESSAGE, validateResponse } from "./response.js";

const questions: QuestionShape[] = [
  {
    id: "single",
    type: "SINGLE_CHOICE",
    required: true,
    scaleMin: null,
    scaleMax: null,
    options: [{ id: "a" }, { id: "b" }],
  },
  {
    id: "multi",
    type: "MULTIPLE_CHOICE",
    required: false,
    scaleMin: null,
    scaleMax: null,
    options: [{ id: "x" }, { id: "y" }, { id: "z" }],
  },
  { id: "scale", type: "SCALE", required: true, scaleMin: 1, scaleMax: 5, options: [] },
  { id: "text", type: "TEXT", required: false, scaleMin: null, scaleMax: null, options: [] },
];

const valid = [
  { questionId: "single", optionIds: ["a"] },
  { questionId: "scale", value: 4 },
];

describe("validateResponse", () => {
  it("accepts a complete response and keeps only relevant fields", () => {
    const result = validateResponse(questions, [
      { questionId: "single", optionIds: ["a"], text: "ignored" },
      { questionId: "multi", optionIds: ["x", "z", "x"] },
      { questionId: "scale", value: 5 },
      { questionId: "text", text: "  Great sprint  " },
    ]);

    expect(result).toEqual({
      ok: true,
      answers: [
        { questionId: "single", optionIds: ["a"] },
        { questionId: "multi", optionIds: ["x", "z"] },
        { questionId: "scale", value: 5 },
        { questionId: "text", text: "Great sprint" },
      ],
    });
  });

  it("skips optional questions that were left empty", () => {
    const result = validateResponse(questions, [...valid, { questionId: "text", text: "   " }]);
    expect(result.ok && result.answers.map((a) => a.questionId)).toEqual(["single", "scale"]);
  });

  it("requires required questions", () => {
    const result = validateResponse(questions, []);
    expect(result).toEqual({
      ok: false,
      errors: { single: REQUIRED_MESSAGE, scale: REQUIRED_MESSAGE },
    });
  });

  it("rejects options from another question", () => {
    const result = validateResponse(questions, [
      { questionId: "single", optionIds: ["x"] },
      { questionId: "scale", value: 3 },
    ]);
    expect(result).toEqual({ ok: false, errors: { single: "Unknown option" } });
  });

  it("allows only one option for single choice", () => {
    const result = validateResponse(questions, [
      { questionId: "single", optionIds: ["a", "b"] },
      { questionId: "scale", value: 3 },
    ]);
    expect(result.ok).toBe(false);
  });

  it.each([0, 6, 2.5])("rejects scale value %s outside 1..5", (value) => {
    const result = validateResponse(questions, [
      { questionId: "single", optionIds: ["a"] },
      { questionId: "scale", value },
    ]);
    expect(result).toEqual({ ok: false, errors: { scale: "Pick a value from 1 to 5" } });
  });

  it("rejects unknown and duplicated questions", () => {
    const result = validateResponse(questions, [
      ...valid,
      { questionId: "single", optionIds: ["b"] },
      { questionId: "ghost", text: "boo" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.single).toBe("This question was answered twice");
      expect(result.errors._form).toBeDefined();
    }
  });
});
