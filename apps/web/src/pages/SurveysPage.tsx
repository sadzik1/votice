import type { SurveySummary } from "@survey/shared";
import { Link, useNavigate } from "react-router";
import { useCreateSurvey, useDeleteSurvey, useSurveys } from "../api/surveys.ts";
import { useConfirm } from "../components/ConfirmDialog.tsx";
import { ChartIcon, PlusIcon, TrashIcon } from "../components/icons.tsx";
import { StatusBadge } from "../components/StatusBadge.tsx";
import { Alert, Button, buttonClass, PageHeader, PageSpinner } from "../components/ui.tsx";
import { blankSurveyInput } from "../features/builder/builder-state.ts";
import { errorMessage } from "../lib/errors.ts";
import { formatRelative, pluralize } from "../lib/format.ts";

function SurveyRow({ survey }: { survey: SurveySummary }) {
  const remove = useDeleteSurvey();
  const [confirm, confirmDialog] = useConfirm();

  async function onDelete() {
    const ok = await confirm({
      title: `Delete “${survey.title}”?`,
      description:
        survey.responseCount > 0
          ? `Its ${pluralize(survey.responseCount, "response")} will be deleted too. This cannot be undone.`
          : "This cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) remove.mutate(survey.id);
  }

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-xs">
      {confirmDialog}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            to={`/surveys/${survey.id}`}
            className="truncate font-semibold text-ink hover:text-accent-ink"
          >
            {survey.title}
          </Link>
          <StatusBadge status={survey.status} closesAt={survey.closesAt} />
        </div>
        <p className="mt-1 text-sm text-ink-subtle">
          {pluralize(survey.questionCount, "question")} ·{" "}
          {pluralize(survey.responseCount, "response")} · updated {formatRelative(survey.updatedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {survey.status !== "DRAFT" && (
          <Link
            to={`/surveys/${survey.id}/results`}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            <ChartIcon /> Results
          </Link>
        )}
        <Link
          to={`/surveys/${survey.id}`}
          className={buttonClass({ variant: "secondary", size: "sm" })}
        >
          {survey.status === "DRAFT" ? "Edit" : "Manage"}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          loading={remove.isPending}
          aria-label={`Delete ${survey.title}`}
        >
          <TrashIcon />
        </Button>
      </div>
    </li>
  );
}

export function SurveysPage() {
  const surveys = useSurveys();
  const create = useCreateSurvey();
  const navigate = useNavigate();

  const newSurveyButton = (
    <Button
      loading={create.isPending}
      onClick={() =>
        create.mutate(blankSurveyInput(), { onSuccess: (s) => navigate(`/surveys/${s.id}`) })
      }
    >
      <PlusIcon /> New survey
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="My surveys"
        description="Drafts can be edited. Published surveys collect answers."
        actions={newSurveyButton}
      />

      {create.error && (
        <div className="mb-4">
          <Alert tone="error">{errorMessage(create.error)}</Alert>
        </div>
      )}

      {surveys.isPending ? (
        <PageSpinner />
      ) : surveys.isError ? (
        <Alert tone="error">{errorMessage(surveys.error)}</Alert>
      ) : surveys.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <h2 className="font-semibold">No surveys yet</h2>
          <p className="mt-1 mb-5 text-sm text-ink-muted">
            Create your first survey. It starts as a draft, so nobody sees it until you publish.
          </p>
          {newSurveyButton}
        </div>
      ) : (
        <ul className="space-y-3">
          {surveys.data.map((survey) => (
            <SurveyRow key={survey.id} survey={survey} />
          ))}
        </ul>
      )}
    </div>
  );
}
