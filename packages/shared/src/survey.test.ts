import { describe, expect, it } from "vitest";
import { type SurveyInput, surveyInputSchema } from "./survey.js";

const validSurvey: SurveyInput = {
  title: "  Team retro  ",
  questions: [
    {
      type: "SINGLE_CHOICE",
      title: "How was the sprint?",
      options: [{ label: "Good" }, { label: "Bad" }],
    },
    { type: "TEXT", title: "Anything else?", required: false },
    { type: "SCALE", title: "Rate the release" },
  ],
};

describe("surveyInputSchema", () => {
  it("accepts a valid survey, trims strings and applies defaults", () => {
    const parsed = surveyInputSchema.parse(validSurvey);

    expect(parsed.title).toBe("Team retro");
    expect(parsed.questions[0]?.required).toBe(true);
    expect(parsed.questions[2]).toMatchObject({ scaleMin: 1, scaleMax: 5 });
  });

  it("requires at least one question", () => {
    const result = surveyInputSchema.safeParse({ ...validSurvey, questions: [] });
    expect(result.success).toBe(false);
  });

  it("requires at least two options for choice questions", () => {
    const result = surveyInputSchema.safeParse({
      title: "Poll",
      questions: [{ type: "MULTIPLE_CHOICE", title: "Pick", options: [{ label: "Only one" }] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate options (case-insensitive)", () => {
    const result = surveyInputSchema.safeParse({
      title: "Poll",
      questions: [
        { type: "SINGLE_CHOICE", title: "Pick", options: [{ label: "Yes" }, { label: "yes" }] },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a scale where max is not greater than min", () => {
    const result = surveyInputSchema.safeParse({
      title: "Poll",
      questions: [{ type: "SCALE", title: "Rate", scaleMin: 1, scaleMax: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown question types", () => {
    const result = surveyInputSchema.safeParse({
      title: "Poll",
      questions: [{ type: "DROPDOWN", title: "Pick" }],
    });
    expect(result.success).toBe(false);
  });
});
