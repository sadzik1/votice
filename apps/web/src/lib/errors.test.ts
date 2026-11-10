import { describe, expect, it } from "vitest";
import { ApiRequestError } from "../api/client.ts";
import { apiFieldErrors, issuesToFieldErrors, safeNextPath } from "./errors.ts";

describe("issuesToFieldErrors", () => {
  it("keeps the first message per path", () => {
    expect(
      issuesToFieldErrors([
        { path: ["questions", 0, "title"], message: "Required" },
        { path: ["questions", 0, "title"], message: "Too long" },
        { path: [], message: "Root problem" },
      ]),
    ).toEqual({ "questions.0.title": "Required", _root: "Root problem" });
  });
});

describe("apiFieldErrors", () => {
  it("reads validation errors from an API error", () => {
    const error = new ApiRequestError(400, {
      error: { code: "VALIDATION_ERROR", message: "Invalid", fields: { email: ["Bad email"] } },
    });
    expect(apiFieldErrors(error)).toEqual({ email: "Bad email" });
  });

  it("returns nothing for other errors", () => {
    expect(apiFieldErrors(new Error("boom"))).toEqual({});
  });
});

describe("safeNextPath", () => {
  it.each([
    ["/surveys/abc", "/surveys/abc"],
    [null, "/surveys"],
    ["https://evil.example", "/surveys"],
    ["//evil.example", "/surveys"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
