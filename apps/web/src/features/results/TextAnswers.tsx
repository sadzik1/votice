import { useTextAnswers } from "../../api/results.ts";
import { Alert, Button, Spinner } from "../../components/ui.tsx";
import { errorMessage } from "../../lib/errors.ts";
import { formatRelative } from "../../lib/format.ts";

export function TextAnswers({ surveyId, questionId }: { surveyId: string; questionId: string }) {
  const answers = useTextAnswers(surveyId, questionId);

  if (answers.isPending) return <Spinner className="size-5 text-ink-faint" />;
  if (answers.isError) return <Alert tone="error">{errorMessage(answers.error)}</Alert>;

  const items = answers.data.pages.flatMap((p) => p.items);
  if (items.length === 0) return <p className="text-sm text-ink-subtle">No answers yet.</p>;

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-line">
        {items.map((a) => (
          <li key={a.id} className="py-2.5">
            <p className="text-sm whitespace-pre-line text-ink-soft">{a.text}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{formatRelative(a.createdAt)}</p>
          </li>
        ))}
      </ul>
      {answers.hasNextPage && (
        <Button
          variant="secondary"
          size="sm"
          loading={answers.isFetchingNextPage}
          onClick={() => answers.fetchNextPage()}
        >
          Show more
        </Button>
      )}
    </div>
  );
}
