import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon, ExternalIcon } from "../../components/icons.tsx";
import { Button, buttonClass, Card, inputClass } from "../../components/ui.tsx";

export function publicSurveyUrl(slug: string): string {
  return `${window.location.origin}/s/${slug}`;
}

export function SharePanel({ slug, title }: { slug: string; title: string }) {
  const url = publicSurveyUrl(slug);
  const [qr, setQr] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: "#0f172a", light: "#ffffff" } })
      .then((dataUrl) => !cancelled && setQr(dataUrl))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // clipboard API isn't available everywhere (http, webviews)
      inputRef.current?.focus();
      inputRef.current?.select();
      setCopyState("manual");
    }
  }
  const copied = copyState === "copied";

  return (
    <Card className="flex flex-col gap-5 sm:flex-row">
      <div className="min-w-0 flex-1 space-y-3">
        <h2 className="font-semibold">Share</h2>
        <p className="text-sm text-ink-muted">Anyone with this link can answer the survey.</p>
        <div className="flex gap-2">
          <label htmlFor="share-url" className="sr-only">
            Public link
          </label>
          <input
            ref={inputRef}
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className={inputClass}
          />
          <Button variant="secondary" onClick={copy} aria-label="Copy link">
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {copyState === "manual" && (
          <p role="status" className="text-xs text-ink-subtle">
            The link is selected. Press Ctrl+C (⌘C on Mac) to copy it.
          </p>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={buttonClass({ variant: "ghost", size: "sm" })}
        >
          <ExternalIcon /> Open the survey
        </a>
      </div>
      {qr && (
        <div className="flex shrink-0 flex-col items-center gap-2">
          <img
            src={qr}
            alt={`QR code linking to ${title}`}
            className="size-36 rounded-lg border border-line"
          />
          <a
            href={qr}
            download={`survey-${slug}-qr.png`}
            className={buttonClass({ variant: "ghost", size: "sm" })}
          >
            <DownloadIcon /> QR code
          </a>
        </div>
      )}
    </Card>
  );
}
