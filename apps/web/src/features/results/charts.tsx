import type { ChoiceQuestionResults, ScaleQuestionResults } from "@survey/shared";
import { pluralize } from "../../lib/format.ts";

const percent = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

// % is of all responses, so multiple choice can add up to more than 100
export function ChoiceBars({
  options,
  total,
}: {
  options: ChoiceQuestionResults["options"];
  total: number;
}) {
  const max = Math.max(1, ...options.map((o) => o.count));

  return (
    <ul className="space-y-3">
      {options.map((o) => {
        const share = percent(o.count, total);
        return (
          <li
            key={o.id}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
            aria-label={`${o.label}: ${pluralize(o.count, "response")}, ${share}%`}
          >
            <span className="truncate text-sm text-ink-soft" title={o.label}>
              {o.label}
            </span>
            <span className="text-sm text-ink-subtle tabular-nums">
              <span className="font-medium text-ink">{o.count}</span> · {share}%
            </span>
            <div aria-hidden className="col-span-2 h-3 rounded-r bg-subtle">
              {o.count > 0 && (
                <div
                  className="h-full rounded-r bg-chart transition-[width] duration-500 group-hover:bg-chart-hover"
                  style={{ width: `${(o.count / max) * 100}%` }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ScaleColumns({ distribution, average, scaleMin, scaleMax }: ScaleQuestionResults) {
  const max = Math.max(1, ...distribution.map((d) => d.count));
  const CHART_HEIGHT = 120;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Average <span className="text-lg font-semibold text-ink">{average ?? "—"}</span>
        <span className="text-ink-faint"> / {scaleMax}</span>
      </p>
      <div
        aria-hidden
        className="flex items-end gap-0.5 border-b border-line"
        style={{ height: CHART_HEIGHT + 20 }}
      >
        {distribution.map((d) => (
          <div key={d.value} className="group flex flex-1 flex-col items-center justify-end">
            <span className="mb-1 text-xs text-ink-subtle tabular-nums">
              {d.count > 0 ? d.count : ""}
            </span>
            <div
              title={`${d.value}: ${pluralize(d.count, "response")}`}
              className="w-full max-w-6 rounded-t bg-chart transition-[height] duration-500 group-hover:bg-chart-hover"
              style={{ height: d.count > 0 ? Math.max(4, (d.count / max) * CHART_HEIGHT) : 0 }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex gap-0.5">
        {distribution.map((d) => (
          <span key={d.value} className="flex-1 text-center text-xs text-ink-subtle tabular-nums">
            {d.value}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>
          Answers from {scaleMin} to {scaleMax}
        </caption>
        <thead>
          <tr>
            <th scope="col">Value</th>
            <th scope="col">Responses</th>
          </tr>
        </thead>
        <tbody>
          {distribution.map((d) => (
            <tr key={d.value}>
              <td>{d.value}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
