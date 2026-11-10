import { describe, expect, it } from "vitest";
import { loginInputSchema, registerInputSchema } from "./auth.js";

describe("registerInputSchema", () => {
  it("normalizes the email", () => {
    const parsed = registerInputSchema.parse({
      name: " Ann ",
      email: "  Ann@Example.COM ",
      password: "long-enough",
    });
    expect(parsed).toEqual({ name: "Ann", email: "ann@example.com", password: "long-enough" });
  });

  it("rejects short passwords and invalid emails", () => {
    const result = registerInputSchema.safeParse({ name: "Ann", email: "nope", password: "short" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["email", "password"]));
  });
});

describe("loginInputSchema", () => {
  it("requires a password", () => {
    expect(loginInputSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
