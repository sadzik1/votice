import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("Correct horse battery staple", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "md5$abc")).toBe(false);
  });
});
