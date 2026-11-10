import { QUESTION_TYPES, type QuestionType } from "@survey/shared";
import type { HTMLAttributes } from "react";
import { CopyIcon, GripIcon, PlusIcon, TrashIcon, XIcon } from "../../components/icons.tsx";
import {
  Button,
  cx,
  errorProps,
  inputBaseClass,
  inputClass,
  invalidInputClass,
} from "../../components/ui.tsx";
import type { FieldErrors } from "../../lib/errors.ts";
import { QUESTION_TYPE_LABELS } from "../../lib/format.ts";
import { type BuilderQuestion, changeQuestionType, isChoice, newOption } from "./builder-state.ts";

type Props = {
  question: BuilderQuestion;
  index: number;
  errors: FieldErrors;
  canRemove: boolean;
  autoFocus: boolean;
  dragHandleProps: HTMLAttributes<HTMLButtonElement>;
  onChange: (question: BuilderQuestion) => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

const SCALE_MAX_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

export function QuestionEditor({
  question: q,
  index,
  errors,
  canRemove,
  autoFocus,
  dragHandleProps,
  onChange,
  onDuplicate,
  onRemove,
}: Props) {
  const path = `questions.${index}`;
  const titleId = `q-${q.key}-title`;
  const titleError = errors[`${path}.title`];
  const optionsError = errors[`${path}.options`];

  const updateOption = (key: string, label: string) =>
    onChange({ ...q, options: q.options.map((o) => (o.key === key ? { ...o, label } : o)) });

  return (
    <div className="rounded-xl border border-line bg-surface shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <button
          type="button"
          className="cursor-grab rounded p-1 text-ink-faint hover:bg-subtle hover:text-ink-soft active:cursor-grabbing"
          aria-label={`Reorder question ${index + 1}`}
          {...dragHandleProps}
        >
          <GripIcon />
        </button>
        <span className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
          Question {index + 1}
        </span>
        <select
          aria-label="Question type"
          value={q.type}
          onChange={(e) => onChange(changeQuestionType(q, e.target.value as QuestionType))}
          className={cx(inputBaseClass, "ml-auto py-1.5")}
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={onDuplicate} aria-label="Duplicate question">
          <CopyIcon />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Delete question"
        >
          <TrashIcon />
        </Button>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-1.5">
          <label htmlFor={titleId} className="sr-only">
            Question text
          </label>
          <input
            id={titleId}
            value={q.title}
            placeholder="Type your question"
            // biome-ignore lint/a11y/noAutofocus: focusing a question the user just added is expected
            autoFocus={autoFocus}
            onChange={(e) => onChange({ ...q, title: e.target.value })}
            className={cx(inputClass, "text-base font-medium", titleError && invalidInputClass)}
            {...errorProps(titleId, titleError)}
          />
          {titleError && (
            <p id={`${titleId}-error`} className="text-sm text-danger">
              {titleError}
            </p>
          )}
        </div>

        {isChoice(q.type) && (
          <div className="space-y-2">
            {q.options.map((option, optionIndex) => {
              const optionId = `q-${q.key}-o-${option.key}`;
              const error = errors[`${path}.options.${optionIndex}.label`];
              return (
                <div key={option.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={cx(
                      "size-4 shrink-0 border-2 border-line-strong",
                      q.type === "SINGLE_CHOICE" ? "rounded-full" : "rounded",
                    )}
                  />
                  <label htmlFor={optionId} className="sr-only">
                    Option {optionIndex + 1}
                  </label>
                  <input
                    id={optionId}
                    value={option.label}
                    placeholder={`Option ${optionIndex + 1}`}
                    onChange={(e) => updateOption(option.key, e.target.value)}
                    className={cx(inputClass, "py-1.5", error && invalidInputClass)}
                    aria-invalid={error ? true : undefined}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={q.options.length <= 2}
                    aria-label={`Remove option ${optionIndex + 1}`}
                    onClick={() =>
                      onChange({ ...q, options: q.options.filter((o) => o.key !== option.key) })
                    }
                  >
                    <XIcon />
                  </Button>
                </div>
              );
            })}
            {optionsError && <p className="text-sm text-danger">{optionsError}</p>}
            <Button
              variant="ghost"
              size="sm"
              disabled={q.options.length >= 20}
              onClick={() =>
                onChange({
                  ...q,
                  options: [...q.options, newOption(`Option ${q.options.length + 1}`)],
                })
              }
            >
              <PlusIcon /> Add option
            </Button>
          </div>
        )}

        {q.type === "SCALE" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              <label htmlFor={`${titleId}-min`}>From</label>
              <select
                id={`${titleId}-min`}
                value={q.scaleMin}
                onChange={(e) => onChange({ ...q, scaleMin: Number(e.target.value) })}
                className={cx(inputBaseClass, "py-1.5")}
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
              </select>
              <label htmlFor={`${titleId}-max`}>to</label>
              <select
                id={`${titleId}-max`}
                value={q.scaleMax}
                onChange={(e) => onChange({ ...q, scaleMax: Number(e.target.value) })}
                className={cx(inputBaseClass, "py-1.5")}
              >
                {SCALE_MAX_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div aria-hidden className="flex flex-wrap gap-1.5">
              {Array.from(
                { length: Math.max(0, q.scaleMax - q.scaleMin + 1) },
                (_, i) => q.scaleMin + i,
              ).map((value) => (
                <span
                  key={value}
                  className="grid size-9 place-items-center rounded-lg border border-line text-sm text-ink-subtle"
                >
                  {value}
                </span>
              ))}
            </div>
            {errors[`${path}.scaleMax`] && (
              <p className="text-sm text-danger">{errors[`${path}.scaleMax`]}</p>
            )}
          </div>
        )}

        {q.type === "TEXT" && (
          <div
            aria-hidden
            className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-sm text-ink-faint"
          >
            Respondents type their answer here
          </div>
        )}

        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={q.required}
            onChange={(e) => onChange({ ...q, required: e.target.checked })}
            className="size-4 rounded border-line-strong accent-indigo-600"
          />
          Required
        </label>
      </div>
    </div>
  );
}
