import { useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "pending" | "saving" | "invalid" | "error";

type Options<T> = {
  value: T;
  isValid: boolean;
  save: (value: T) => Promise<unknown>;
  delayMs?: number;
};

// saves are queued so an older request can't overwrite a newer one
export function useAutosave<T>({ value, isValid, save, delayMs = 800 }: Options<T>): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const isFirstRender = useRef(true);
  const version = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    version.current += 1;
    const myVersion = version.current;

    if (!isValid) {
      setStatus("invalid");
      return;
    }
    setStatus("pending");

    const timer = setTimeout(() => {
      setStatus("saving");
      const run = queue.current.then(() => saveRef.current(value));
      queue.current = run.catch(() => {});
      run.then(
        () => version.current === myVersion && setStatus("saved"),
        () => version.current === myVersion && setStatus("error"),
      );
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, isValid, delayMs]);

  useEffect(() => {
    if (status === "saved") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [status]);

  return status;
}
