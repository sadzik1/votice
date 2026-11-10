import { Link } from "react-router";
import { useMe } from "../api/auth.ts";
import { buttonClass } from "../components/ui.tsx";

const features = [
  { title: "Build", text: "Choice, text and scale questions with drag-and-drop ordering." },
  { title: "Share", text: "Publish with one click and send a link or a QR code." },
  { title: "Analyze", text: "Watch results update live and export them to CSV." },
];

export function HomePage() {
  const me = useMe();

  return (
    <div className="space-y-12">
      <section className="space-y-5 text-center sm:py-8">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Ask better questions. <span className="text-accent-ink">Get answers live.</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-pretty text-ink-muted">
          Create a survey in minutes, share a link, and see responses come in as they happen.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {me.data ? (
            <Link to="/surveys" className={buttonClass()}>
              Go to my surveys
            </Link>
          ) : (
            <>
              <Link to="/register" className={buttonClass()}>
                Create a free account
              </Link>
              <Link to="/login" className={buttonClass({ variant: "secondary" })}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
