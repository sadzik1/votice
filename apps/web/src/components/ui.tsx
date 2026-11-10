import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const buttonVariants = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-accent",
  secondary:
    "bg-surface text-ink shadow-sm ring-1 ring-line-strong ring-inset hover:bg-subtle focus-visible:outline-accent",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-500 focus-visible:outline-rose-600",
  ghost: "text-ink-muted hover:bg-subtle hover:text-ink focus-visible:outline-accent",
} as const;

const buttonSizes = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
} as const;

type ButtonStyle = {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

export function buttonClass({ variant = "primary", size = "md" }: ButtonStyle = {}): string {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariants[variant],
    buttonSizes[size],
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle & { loading?: boolean };

export function Button({
  variant,
  size,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(buttonClass({ variant, size }), className)}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export const inputBaseClass = cx(
  "rounded-lg border-0 bg-surface px-3 py-2 text-sm text-ink shadow-sm",
  "ring-1 ring-line-strong ring-inset placeholder:text-ink-faint",
  "focus:ring-2 focus:ring-accent focus:ring-inset focus:outline-none",
  "disabled:bg-subtle disabled:text-ink-subtle",
);

export const inputClass = cx(inputBaseClass, "block w-full");

export const invalidInputClass = "ring-danger/70 focus:ring-danger";

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function errorProps(id: string, error: string | undefined) {
  return error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-20 text-ink-faint">
      <Spinner className="size-8" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

const alertTones = {
  error:
    "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-400/30",
  success:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-400/30",
  info: "bg-indigo-50 text-indigo-800 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-400/30",
  warning:
    "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30",
} as const;

export function Alert({
  tone = "info",
  children,
}: {
  tone?: keyof typeof alertTones;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("rounded-lg px-4 py-3 text-sm ring-1 ring-inset", alertTones[tone])}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-balance">{title}</h1>
        {description && <div className="mt-1 text-sm text-ink-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-xl border border-line bg-surface p-5 shadow-xs", className)}>
      {children}
    </div>
  );
}
