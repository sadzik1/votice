import type { HealthResponse } from "@survey/shared";

type Props = {
  health: HealthResponse | undefined;
  isLoading: boolean;
};

const styles = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
  warn: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
  error:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
  idle: "bg-subtle text-ink-muted ring-ink-subtle/20",
} as const;

function describe({ health, isLoading }: Props): { tone: keyof typeof styles; label: string } {
  if (isLoading) return { tone: "idle", label: "Checking API…" };
  if (!health) return { tone: "error", label: "API offline" };
  if (health.db === "down") return { tone: "warn", label: "API up, database down" };
  return { tone: "ok", label: "All systems operational" };
}

export function ApiStatus(props: Props) {
  const { tone, label } = describe(props);

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${styles[tone]}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
