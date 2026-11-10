import { describe, expect, it } from "vitest";
import { formatRelative, pluralize } from "./format.ts";

describe("formatRelative", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it.each([
    ["2026-06-01T11:59:30Z", "just now"],
    ["2026-06-01T09:00:00Z", "3 hours ago"],
    ["2026-05-31T12:00:00Z", "yesterday"],
    ["2026-06-03T12:00:00Z", "in 2 days"],
  ])("%s -> %s", (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });
});

describe("pluralize", () => {
  it("handles one and many", () => {
    expect(pluralize(1, "response")).toBe("1 response");
    expect(pluralize(0, "response")).toBe("0 responses");
  });
});
