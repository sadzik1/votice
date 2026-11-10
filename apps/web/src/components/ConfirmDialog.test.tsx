import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useConfirm } from "./ConfirmDialog.tsx";

afterEach(cleanup);

function Harness() {
  const [confirm, dialog] = useConfirm();
  const [result, setResult] = useState("none");
  return (
    <>
      <button
        type="button"
        onClick={async () =>
          setResult(
            String(await confirm({ title: "Publish this survey?", confirmLabel: "Publish" })),
          )
        }
      >
        Open
      </button>
      <output>{result}</output>
      {dialog}
    </>
  );
}

describe("useConfirm", () => {
  it("resolves true when the action is confirmed", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));

    expect(screen.getByRole("dialog", { name: "Publish this survey?" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("true"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("resolves false on cancel", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("false"));
  });
});
