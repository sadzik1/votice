import { LIMITS, type QuestionDto } from "@survey/shared";
import { cx, inputClass, invalidInputClass } from "../../components/ui.tsx";

export type AnswerDraft = {
  optionIds?: string[];
  text?: string;
  value?: number;
};

type Props = {
  question: QuestionDto;
  number: number;
  answer: AnswerDraft | undefined;
  error: string | undefined;
  onChange: (answer: AnswerDraft) => void;
};

const optionRowClass = cx(
  "flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm",
  "hover:bg-subtle has-checked:border-accent has-checked:bg-accent-soft",
  "has-focus-visible:ring-2 has-focus-visible:ring-accent",
);

export function QuestionField({ question: q, number, answer, error, onChange }: Props) {
  const errorId = `question-${q.id}-error`;
  const describedBy = error ? errorId : undefined;

  return (
    <fieldset
      id={`question-${q.id}`}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={cx(
        "scroll-mt-20 rounded-xl border bg-surface p-5 shadow-xs",
        error ? "border-danger/50" : "border-line",
      )}
    >
      <legend className="sr-only">{q.title}</legend>
      <p aria-hidden className="mb-4 font-medium text-ink">
        <span className="mr-1.5 text-ink-faint">{number}.</span>
        {q.title}
        {q.required && <span className="ml-1 text-danger">*</span>}
        {q.type === "MULTIPLE_CHOICE" && (
          <span className="ml-2 text-xs font-normal text-ink-subtle">Select all that apply</span>
        )}
      </p>

      {q.type === "SINGLE_CHOICE" && (
        <div className="space-y-2">
          {q.options.map((o) => (
            <label key={o.id} className={optionRowClass}>
              <input
                type="radio"
                name={q.id}
                value={o.id}
                checked={answer?.optionIds?.[0] === o.id}
                onChange={() => onChange({ optionIds: [o.id] })}
                className="size-4 accent-indigo-600"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}

      {q.type === "MULTIPLE_CHOICE" && (
        <div className="space-y-2">
          {q.options.map((o) => {
            const selected = answer?.optionIds ?? [];
            const checked = selected.includes(o.id);
            return (
              <label key={o.id} className={optionRowClass}>
                <input
                  type="checkbox"
                  value={o.id}
                  checked={checked}
                  onChange={() =>
                    onChange({
                      optionIds: checked
                        ? selected.filter((id) => id !== o.id)
                        : [...selected, o.id],
                    })
                  }
                  className="size-4 rounded accent-indigo-600"
                />
                {o.label}
              </label>
            );
          })}
        </div>
      )}

      {q.type === "SCALE" && q.scaleMin !== null && q.scaleMax !== null && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, i) => {
            const value = (q.scaleMin ?? 0) + i;
            return (
              <label
                key={value}
                className={cx(
                  "grid size-11 cursor-pointer place-items-center rounded-lg border border-line text-sm font-medium",
                  "hover:bg-subtle has-checked:border-accent has-checked:bg-indigo-600 has-checked:text-white",
                  "has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2",
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={value}
                  checked={answer?.value === value}
                  onChange={() => onChange({ value })}
                  className="sr-only"
                />
                {value}
              </label>
            );
          })}
        </div>
      )}

      {q.type === "TEXT" && (
        <div>
          <textarea
            aria-label={q.title}
            rows={4}
            maxLength={LIMITS.textAnswerMax}
            value={answer?.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
            className={cx(inputClass, error && invalidInputClass)}
          />
          <p className="mt-1 text-right text-xs text-ink-faint">
            {(answer?.text ?? "").length} / {LIMITS.textAnswerMax}
          </p>
        </div>
      )}

      {error && (
        <p id={errorId} className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function isAnswered(answer: AnswerDraft | undefined): boolean {
  if (!answer) return false;
  return (
    (answer.optionIds?.length ?? 0) > 0 ||
    (answer.text?.trim().length ?? 0) > 0 ||
    answer.value !== undefined
  );
}
