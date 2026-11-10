import { z } from "zod";
import { SURVEY_STATUSES } from "./status.js";

// keep in sync with the prisma enum
export const QUESTION_TYPES = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TEXT", "SCALE"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const LIMITS = {
  titleMax: 200,
  descriptionMax: 2000,
  questionsMax: 50,
  optionsMin: 2,
  optionsMax: 20,
  textAnswerMax: 5000,
} as const;

const optionInputSchema = z.object({
  label: z.string().trim().min(1, "Option label is required").max(LIMITS.titleMax),
});

const questionBase = {
  title: z.string().trim().min(1, "Question title is required").max(LIMITS.titleMax),
  required: z.boolean().default(true),
};

const choiceQuestionSchema = z.object({
  ...questionBase,
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]),
  options: z
    .array(optionInputSchema)
    .min(LIMITS.optionsMin, `Add at least ${LIMITS.optionsMin} options`)
    .max(LIMITS.optionsMax)
    .refine(
      (options) => new Set(options.map((o) => o.label.toLowerCase())).size === options.length,
      "Options must be unique",
    ),
});

const textQuestionSchema = z.object({
  ...questionBase,
  type: z.literal("TEXT"),
});

const scaleQuestionSchema = z
  .object({
    ...questionBase,
    type: z.literal("SCALE"),
    scaleMin: z.int().min(0).max(1).default(1),
    scaleMax: z.int().min(2).max(10).default(5),
  })
  .refine((q) => q.scaleMax > q.scaleMin, {
    message: "Scale max must be greater than min",
    path: ["scaleMax"],
  });

export const questionInputSchema = z.discriminatedUnion("type", [
  choiceQuestionSchema,
  textQuestionSchema,
  scaleQuestionSchema,
]);

export const surveyInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(LIMITS.titleMax),
  description: z.string().trim().max(LIMITS.descriptionMax).optional(),
  closesAt: z.iso.datetime().nullable().optional(),
  questions: z
    .array(questionInputSchema)
    .min(1, "Add at least one question")
    .max(LIMITS.questionsMax),
});

export const statusChangeInputSchema = z.object({
  status: z.enum(SURVEY_STATUSES),
});

export const responseInputSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        optionIds: z.array(z.string().min(1)).max(LIMITS.optionsMax).optional(),
        text: z.string().trim().max(LIMITS.textAnswerMax).optional(),
        value: z.int().optional(),
      }),
    )
    .max(LIMITS.questionsMax),
});

export type SurveyInput = z.input<typeof surveyInputSchema>;
export type ParsedSurvey = z.output<typeof surveyInputSchema>;
export type QuestionInput = z.input<typeof questionInputSchema>;
export type ResponseInput = z.input<typeof responseInputSchema>;
export type AnswerInput = ResponseInput["answers"][number];
export type StatusChangeInput = z.input<typeof statusChangeInputSchema>;
