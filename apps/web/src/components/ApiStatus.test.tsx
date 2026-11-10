import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApiStatus } from "./ApiStatus.tsx";

afterEach(cleanup);

describe("ApiStatus", () => {
  it("shows a loading state", () => {
    render(<ApiStatus health={undefined} isLoading />);
    expect(screen.getByRole("status").textContent).toBe("Checking API…");
  });

  it("shows offline when the API did not answer", () => {
    render(<ApiStatus health={undefined} isLoading={false} />);
    expect(screen.getByRole("status").textContent).toBe("API offline");
  });

  it("warns when the database is down", () => {
    render(<ApiStatus health={{ status: "ok", db: "down", uptimeSeconds: 1 }} isLoading={false} />);
    expect(screen.getByRole("status").textContent).toBe("API up, database down");
  });

  it("is green when everything is up", () => {
    render(<ApiStatus health={{ status: "ok", db: "up", uptimeSeconds: 1 }} isLoading={false} />);
    expect(screen.getByRole("status").textContent).toBe("All systems operational");
  });
});
