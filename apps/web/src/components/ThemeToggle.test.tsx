import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveTheme } from "../lib/theme.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});
afterEach(cleanup);

describe("resolveTheme", () => {
  it.each([
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["system", true, "dark"],
    ["system", false, "light"],
  ] as const)("%s with OS dark=%s -> %s", (preference, prefersDark, expected) => {
    expect(resolveTheme(preference, prefersDark)).toBe(expected);
  });
});

describe("ThemeToggle", () => {
  it("starts on the system theme", () => {
    render(<ThemeToggle />);
    expect(screen.getByLabelText("Use system theme").getAttribute("aria-pressed")).toBe("true");
  });

  it("switches to dark, remembers it, and goes back to light", () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByLabelText("Dark theme"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(screen.getByLabelText("Dark theme").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByLabelText("Light theme"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("forgets the stored choice when switching back to system", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    fireEvent.click(screen.getByLabelText("Use system theme"));
    expect(localStorage.getItem("theme")).toBeNull();
  });
});
