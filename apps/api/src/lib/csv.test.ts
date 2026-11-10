import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "./csv.js";

describe("escapeCsvCell", () => {
  it.each([
    ["plain", "plain"],
    ["a,b", '"a,b"'],
    ['say "hi"', '"say ""hi"""'],
    ["line\nbreak", '"line\nbreak"'],
    ["=HYPERLINK(1)", "'=HYPERLINK(1)"],
    ["+1", "'+1"],
    ["@cmd", "'@cmd"],
    ["Привет", "Привет"],
  ])("%j -> %j", (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF and starts with a BOM", () => {
    expect(
      toCsv([
        ["a", "b"],
        ["1", "x,y"],
      ]),
    ).toBe('﻿a,b\r\n1,"x,y"\r\n');
  });
});
