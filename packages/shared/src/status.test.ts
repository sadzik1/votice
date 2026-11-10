import { describe, expect, it } from "vitest";
import { canTransition, isAcceptingResponses } from "./status.js";

describe("canTransition", () => {
  it.each([
    ["DRAFT", "OPEN", true],
    ["OPEN", "CLOSED", true],
    ["CLOSED", "OPEN", true],
    ["DRAFT", "CLOSED", false],
    ["OPEN", "DRAFT", false],
    ["CLOSED", "DRAFT", false],
  ] as const)("%s -> %s is %s", (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });
});

describe("isAcceptingResponses", () => {
  const now = new Date("2026-01-01T12:00:00Z");

  it("accepts responses for an open survey without a deadline", () => {
    expect(isAcceptingResponses({ status: "OPEN", closesAt: null }, now)).toBe(true);
  });

  it("rejects responses once the deadline has passed", () => {
    const closesAt = new Date("2026-01-01T11:59:59Z");
    expect(isAcceptingResponses({ status: "OPEN", closesAt }, now)).toBe(false);
  });

  it("rejects responses for drafts and closed surveys", () => {
    expect(isAcceptingResponses({ status: "DRAFT", closesAt: null }, now)).toBe(false);
    expect(isAcceptingResponses({ status: "CLOSED", closesAt: null }, now)).toBe(false);
  });
});
