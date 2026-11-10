import type { SurveyDetail } from "@survey/shared";
import { Link } from "react-router";
import { useChangeStatus } from "../../api/surveys.ts";
import { useConfirm } from "../../components/ConfirmDialog.tsx";
import { ArrowLeftIcon, ChartIcon } from "../../components/icons.tsx";
import { effectiveStatus, StatusBadge } from "../../components/StatusBadge.tsx";
import { Alert, Button, buttonClass, Card, PageHeader } from "../../components/ui.tsx";
import { errorMessage } from "../../lib/errors.ts";
import { formatDateTime, pluralize, QUESTION_TYPE_LABELS } from "../../lib/format.ts";
import { SharePanel } from "./SharePanel.tsx";

export function SurveyOverview({ survey }: { survey: SurveyDetail }) {
  const changeStatus = useChangeStatus(survey.id);
  const [confirm, confirmDialog] = useConfirm();
  const shownStatus = effectiveStatus(survey);

  async function close() {
    const ok = await confirm({
      title: "Close the survey?",
      description: "New answers will be rejected until you reopen it. Existing results stay.",
      confirmLabel: "Close survey",
    });
    if (ok) changeStatus.mutate("CLOSED");
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <Link
        to="/surveys"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeftIcon /> My surveys
      </Link>

      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {survey.title}
            <StatusBadge status={survey.status} closesAt={survey.closesAt} />
          </span>
        }
        description={
          <>
            {pluralize(survey.responseCount, "response")}
            {survey.publishedAt && <> · published {formatDateTime(survey.publishedAt)}</>}
            {survey.closesAt && <> · deadline {formatDateTime(survey.closesAt)}</>}
          </>
        }
        actions={
          <>
            <Link to={`/surveys/${survey.id}/results`} className={buttonClass()}>
              <ChartIcon /> Results
            </Link>
            {survey.status === "OPEN" ? (
              <Button variant="secondary" onClick={close} loading={changeStatus.isPending}>
                Close survey
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => changeStatus.mutate("OPEN")}
                loading={changeStatus.isPending}
              >
                Reopen
              </Button>
            )}
          </>
        }
      />

      {changeStatus.error && <Alert tone="error">{errorMessage(changeStatus.error)}</Alert>}
      {survey.status === "OPEN" && shownStatus === "CLOSED" && (
        <Alert tone="warning">
          The deadline has passed, so the survey no longer accepts answers.
        </Alert>
      )}

      <SharePanel slug={survey.slug} title={survey.title} />

      <Card>
        <h2 className="mb-3 font-semibold">Questions</h2>
        <p className="mb-4 text-sm text-ink-muted">
          Published surveys are read-only, so every respondent answers the same questions.
        </p>
        <ol className="space-y-3">
          {survey.questions.map((q, i) => (
            <li key={q.id} className="flex gap-3 text-sm">
              <span className="w-5 shrink-0 text-right text-ink-faint">{i + 1}.</span>
              <div>
                <p className="font-medium">
                  {q.title}
                  {q.required && <span className="ml-1 text-danger">*</span>}
                </p>
                <p className="text-ink-subtle">
                  {QUESTION_TYPE_LABELS[q.type]}
                  {q.options.length > 0 && `: ${q.options.map((o) => o.label).join(", ")}`}
                  {q.type === "SCALE" && ` from ${q.scaleMin} to ${q.scaleMax}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
