import type { ComponentType, SVGProps } from "react";
import { type ThemePreference, useTheme } from "../lib/theme.ts";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons.tsx";
import { cx } from "./ui.tsx";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { value: "light", label: "Light theme", Icon: SunIcon },
  { value: "dark", label: "Dark theme", Icon: MoonIcon },
  { value: "system", label: "Use system theme", Icon: MonitorIcon },
];

export function ThemeToggle() {
  const [preference, setPreference] = useTheme();

  return (
    <fieldset className="flex items-center gap-0.5 rounded-lg bg-subtle p-0.5">
      <legend className="sr-only">Color theme</legend>
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={preference === value}
          title={label}
          onClick={() => setPreference(value)}
          className={cx(
            "rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-accent",
            preference === value
              ? "bg-surface text-ink shadow-xs"
              : "text-ink-subtle hover:text-ink",
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </fieldset>
  );
}
