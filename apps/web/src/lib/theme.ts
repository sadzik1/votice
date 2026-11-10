import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function saveThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // ignore, the choice just won't persist
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia?.(DARK_QUERY).matches === true;
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

function applyTheme(preference: ThemePreference): void {
  const dark = resolveTheme(preference, systemPrefersDark()) === "dark";
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
    saveThemePreference(preference);

    // follow OS changes in system mode
    const media = window.matchMedia?.(DARK_QUERY);
    const onSystemChange = () => preference === "system" && applyTheme("system");
    media?.addEventListener("change", onSystemChange);

    // sync between tabs
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setPreference(readThemePreference());
    };
    window.addEventListener("storage", onStorage);

    return () => {
      media?.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [preference]);

  return [preference, setPreference] as const;
}
