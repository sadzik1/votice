import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "./ui.tsx";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
};

type DialogProps = ConfirmOptions & { onClose: (confirmed: boolean) => void };

// window.confirm() is blocked in some embedded browsers, so use a real <dialog>
function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  onClose,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose(false);
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl bg-surface p-0 text-ink shadow-xl ring-1 ring-line-strong backdrop:bg-slate-900/40 dark:backdrop:bg-black/70"
    >
      <form
        method="dialog"
        className="space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onClose(true);
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {description && <div className="text-sm text-ink-muted">{description}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button type="submit" variant={tone === "danger" ? "danger" : "primary"}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<
    (ConfirmOptions & { resolve: (confirmed: boolean) => void }) | null
  >(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  );

  const dialog = pending && (
    <ConfirmDialog
      {...pending}
      onClose={(confirmed) => {
        pending.resolve(confirmed);
        setPending(null);
      }}
    />
  );

  return [confirm, dialog] as const;
}
