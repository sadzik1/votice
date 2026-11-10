import { type PublicSurvey, type ResponseInput, validateResponse } from "@survey/shared";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiRequestError } from "../api/client.ts";
import { usePublicSurvey, useSubmitResponse } from "../api/public.ts";
import { CheckIcon } from "../components/icons.tsx";
import { QueryError } from "../components/QueryError.tsx";
import { Alert, Button, buttonClass, Card, PageSpinner } from "../components/ui.tsx";
import { type AnswerDraft, isAnswered, QuestionField } from "../features/respond/QuestionField.tsx";
import { errorMessage } from "../lib/errors.ts";
import { formatDateTime } from "../lib/format.ts";

function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="space-y-3 px-6 py-12 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      {children && <div className="text-ink-muted">{children}</div>}
      <Link to="/" className={buttonClass({ variant: "secondary", size: "sm" })}>
        Create your own survey
      </Link>
    </Card>
  );
}

function SurveyForm({ slug, survey }: { slug: string; survey: PublicSurvey }) {
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<"done" | "closed" | "duplicate" | null>(null);
  const submit = useSubmitResponse(slug);

  const answeredCount = survey.questions.filter((q) => isAnswered(answers[q.id])).length;
  const progress = Math.round((answeredCount / survey.questions.length) * 100);

  function showErrors(next: Record<string, string>) {
    setErrors(next);
    const first = survey.questions.find((q) => next[q.id]);
    if (first)
      document.getElementById(`question-${first.id}`)?.scrollIntoView({ behavior: "smooth" });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const input: ResponseInput = {
      answers: Object.entries(answers).map(([questionId, a]) => ({ questionId, ...a })),
    };

    // same validation as the server
    const result = validateResponse(survey.questions, input.answers);
    if (!result.ok) {
      showErrors(result.errors);
      return;
    }

    submit.mutate(input, {
      onSuccess: () => setOutcome("done"),
      onError: (error) => {
        if (!(error instanceof ApiRequestError)) return;
        if (error.code === "SURVEY_CLOSED") setOutcome("closed");
        if (error.code === "ALREADY_RESPONDED") setOutcome("duplicate");
        const fields = error.body?.error.fields;
        if (fields) {
          showErrors(
            Object.fromEntries(
              Object.entries(fields).map(([key, messages]) => [
                key.replace(/^answers\./, ""),
                messages[0] ?? "Invalid answer",
              ]),
            ),
          );
        }
      },
    });
  }

  if (outcome === "done") {
    return (
      <Message title="Thanks for your answers!">
        <span className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <CheckIcon className="size-6" />
        </span>
        Your response to “{survey.title}” was recorded.
      </Message>
    );
  }
  if (outcome === "closed") return <Message title="This survey just closed" />;
  if (outcome === "duplicate") return <Message title="You have already answered this survey" />;

  const unexpectedError =
    submit.error && !(submit.error instanceof ApiRequestError && submit.error.body?.error.fields)
      ? errorMessage(submit.error)
      : null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance">{survey.title}</h1>
        {survey.description && <p className="text-ink-muted">{survey.description}</p>}
        {survey.closesAt && (
          <p className="text-sm text-ink-subtle">Open until {formatDateTime(survey.closesAt)}</p>
        )}
        <p className="text-xs text-ink-subtle">
          <span className="text-danger">*</span> Required
        </p>
      </header>

      <div className="sticky top-0 z-10 -mx-4 bg-canvas/90 px-4 py-2 backdrop-blur">
        <div
          role="progressbar"
          aria-label="Answered questions"
          aria-valuenow={answeredCount}
          aria-valuemin={0}
          aria-valuemax={survey.questions.length}
          className="h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full bg-indigo-600 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-ink-subtle">
          {answeredCount} of {survey.questions.length} answered
        </p>
      </div>

      {errors._form && <Alert tone="error">{errors._form}</Alert>}

      {survey.questions.map((q, i) => (
        <QuestionField
          key={q.id}
          question={q}
          number={i + 1}
          answer={answers[q.id]}
          error={errors[q.id]}
          onChange={(answer) => {
            setAnswers((a) => ({ ...a, [q.id]: answer }));
            if (errors[q.id]) setErrors(({ [q.id]: _, ...rest }) => rest);
          }}
        />
      ))}

      {unexpectedError && <Alert tone="error">{unexpectedError}</Alert>}

      <Button type="submit" loading={submit.isPending} className="w-full sm:w-auto">
        Submit answers
      </Button>
    </form>
  );
}

export function TakeSurveyPage() {
  const { slug = "" } = useParams();
  const query = usePublicSurvey(slug);

  if (query.isPending) return <PageSpinner />;
  if (query.isError) return <QueryError error={query.error} backTo="/" />;

  const { survey, accepting, alreadyResponded } = query.data;
  if (alreadyResponded) {
    return <Message title="You have already answered this survey">Thanks for taking part.</Message>;
  }
  if (!accepting) {
    return (
      <Message title={`“${survey.title}” is closed`}>
        This survey is no longer accepting answers.
      </Message>
    );
  }
  return <SurveyForm slug={slug} survey={survey} />;
}
