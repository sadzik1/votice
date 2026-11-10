import { isAcceptingResponses, type SurveyStatus } from "@survey/shared";
import { cx } from "./ui.tsx";

type Props = {
  status: SurveyStatus;
  closesAt: string | null;
};

// open but past the deadline = closed for respondents
export function effectiveStatus({ status, closesAt }: Props): "DRAFT" | "OPEN" | "CLOSED" {
  if (status !== "OPEN") return status;
  return isAcceptingResponses({ status, closesAt: closesAt ? new Date(closesAt) : null })
    ? "OPEN"
    : "CLOSED";
}

const styles = {
  DRAFT: { label: "Draft", className: "bg-subtle text-ink-soft ring-ink-subtle/20" },
  OPEN: {
    label: "Open",
    className:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  },
  CLOSED: {
    label: "Closed",
    className:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
  },
} as const;

export function StatusBadge(props: Props) {
  const { label, className } = styles[effectiveStatus(props)];
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
    >
      {label}
    </span>
  );
}
