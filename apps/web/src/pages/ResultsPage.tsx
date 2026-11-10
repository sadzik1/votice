import type { QuestionResults } from "@survey/shared";
import { Link, useParams } from "react-router";
import { useLiveResults, useResults } from "../api/results.ts";
import { ArrowLeftIcon, DownloadIcon } from "../components/icons.tsx";
import { QueryError } from "../components/QueryError.tsx";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { buttonClass, Card, cx, PageHeader, PageSpinner } from "../components/ui.tsx";
import { ChoiceBars, ScaleColumns } from "../features/results/charts.tsx";
import { TextAnswers } from "../features/results/TextAnswers.tsx";
import { formatRelative, pluralize, QUESTION_TYPE_LABELS } from "../lib/format.ts";

function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
      <span className="relative flex size-2">
        {connected && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={cx(
            "relative inline-flex size-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-line-strong",
          )}
        />
      </span>
      {connected ? "Live" : "Reconnecting…"}
    </span>
  );
}

function QuestionCard({
  surveyId,
  question,
  index,
  total,
}: {
  surveyId: string;
  question: QuestionResults;
  index: number;
  total: number;
}) {
  return (
    <Card>
      <div className="mb-4">
        <h2 className="font-semibold">
          <span className="mr-1.5 text-ink-faint">{index + 1}.</span>
          {question.title}
        </h2>
        <p className="mt-0.5 text-xs text-ink-subtle">
          {QUESTION_TYPE_LABELS[question.type]} · {pluralize(question.answered, "answer")}
          {!question.required && " · optional"}
        </p>
      </div>
      {question.type === "SINGLE_CHOICE" || question.type === "MULTIPLE_CHOICE" ? (
        <ChoiceBars options={question.options} total={total} />
      ) : question.type === "SCALE" ? (
        <ScaleColumns {...question} />
      ) : (
        <TextAnswers surveyId={surveyId} questionId={question.id} />
      )}
    </Card>
  );
}

export function ResultsPage() {
  const { id = "" } = useParams();
  const results = useResults(id);
  const connected = useLiveResults(id);

  if (results.isPending) return <PageSpinner />;
  if (results.isError) return <QueryError error={results.error} />;

  const { survey, totalResponses, lastResponseAt, questions } = results.data;

  return (
    <div className="space-y-6">
      <Link
        to={`/surveys/${survey.id}`}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon /> Back to survey
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {survey.title}
            <StatusBadge status={survey.status} closesAt={survey.closesAt} />
          </span>
        }
        description={<LiveIndicator connected={connected} />}
        actions={
          <a
            href={`/api/surveys/${survey.id}/export.csv`}
            className={buttonClass({ variant: "secondary" })}
            aria-disabled={totalResponses === 0}
          >
            <DownloadIcon /> Export CSV
          </a>
        }
      />

      <Card className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Responses</p>
          <p className="text-5xl font-semibold tracking-tight">
            {totalResponses.toLocaleString("en")}
          </p>
        </div>
        <p className="text-sm text-ink-subtle">
          {lastResponseAt ? `Last response ${formatRelative(lastResponseAt)}` : "No responses yet"}
        </p>
      </Card>

      {survey.status === "DRAFT" ? (
        <Card className="text-center text-ink-muted">
          This survey is a draft. Publish it to start collecting responses.
        </Card>
      ) : (
        questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            surveyId={survey.id}
            question={q}
            index={i}
            total={totalResponses}
          />
        ))
      )}
    </div>
  );
}
