import type { QuestionType } from "@survey/shared";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTIPLE_CHOICE: "Multiple choice",
  TEXT: "Text answer",
  SCALE: "Scale",
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso),
  );
}

export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}
