import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChoiceBars } from "./charts.tsx";

afterEach(cleanup);

describe("ChoiceBars", () => {
  it("labels each option with its count and share of responses", () => {
    render(
      <ChoiceBars
        total={4}
        options={[
          { id: "a", label: "Yes", count: 3 },
          { id: "b", label: "No", count: 1 },
          { id: "c", label: "Maybe", count: 0 },
        ]}
      />,
    );

    expect(screen.getByLabelText("Yes: 3 responses, 75%")).toBeDefined();
    expect(screen.getByLabelText("No: 1 response, 25%")).toBeDefined();
    expect(screen.getByLabelText("Maybe: 0 responses, 0%")).toBeDefined();
  });
});
