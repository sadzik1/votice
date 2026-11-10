import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QUESTION_TYPES, type QuestionType, type SurveyDetail } from "@survey/shared";
import { type ComponentProps, useMemo, useState } from "react";
import { Link } from "react-router";
import { useChangeStatus, useSaveSurvey } from "../../api/surveys.ts";
import { useConfirm } from "../../components/ConfirmDialog.tsx";
import { ArrowLeftIcon, CheckIcon, PlusIcon } from "../../components/icons.tsx";
import {
  Alert,
  Button,
  Card,
  cx,
  errorProps,
  Field,
  inputBaseClass,
  inputClass,
  invalidInputClass,
  Spinner,
} from "../../components/ui.tsx";
import { errorMessage } from "../../lib/errors.ts";
import { QUESTION_TYPE_LABELS } from "../../lib/format.ts";
import {
  type BuilderQuestion,
  type BuilderState,
  duplicateQuestion,
  fromSurvey,
  newQuestion,
  toSurveyInput,
  validateBuilder,
} from "./builder-state.ts";
import { QuestionEditor } from "./QuestionEditor.tsx";
import { type SaveStatus, useAutosave } from "./useAutosave.ts";

function SaveIndicator({ status }: { status: SaveStatus }) {
  const content: Record<SaveStatus, { text: string; className: string }> = {
    saved: { text: "All changes saved", className: "text-ink-subtle" },
    pending: { text: "Unsaved changes", className: "text-ink-subtle" },
    saving: { text: "Saving…", className: "text-ink-subtle" },
    invalid: { text: "Fix the highlighted fields to save", className: "text-warning" },
    error: { text: "Couldn't save. Retrying on next change", className: "text-danger" },
  };
  const { text, className } = content[status];
  return (
    <span role="status" className={cx("flex items-center gap-1.5 text-sm", className)}>
      {status === "saving" && <Spinner className="size-3.5" />}
      {status === "saved" && <CheckIcon className="size-3.5" />}
      {text}
    </span>
  );
}

function SortableQuestion(props: Omit<ComponentProps<typeof QuestionEditor>, "dragHandleProps">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.question.key,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx("relative", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <QuestionEditor {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export function SurveyBuilder({ survey }: { survey: SurveyDetail }) {
  const [state, setState] = useState<BuilderState>(() => fromSurvey(survey));
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  const errors = useMemo(() => validateBuilder(state), [state]);
  const isValid = Object.keys(errors).length === 0;

  const save = useSaveSurvey(survey.id);
  const publish = useChangeStatus(survey.id);
  const [confirm, confirmDialog] = useConfirm();
  const status = useAutosave({
    value: state,
    isValid,
    save: (value) => save.mutateAsync(toSurveyInput(value)),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const setQuestions = (update: (questions: BuilderQuestion[]) => BuilderQuestion[]) =>
    setState((s) => ({ ...s, questions: update(s.questions) }));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    setQuestions((qs) => {
      const from = qs.findIndex((q) => q.key === active.id);
      const to = qs.findIndex((q) => q.key === over.id);
      return arrayMove(qs, from, to);
    });
  }

  function addQuestion(type: QuestionType) {
    const question = newQuestion(type);
    setLastAddedKey(question.key);
    setQuestions((qs) => [...qs, question]);
  }

  async function onPublish() {
    const ok = await confirm({
      title: "Publish this survey?",
      description:
        "Anyone with the link will be able to answer. Questions can no longer be edited after publishing.",
      confirmLabel: "Publish",
    });
    if (ok) publish.mutate("OPEN");
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <div className="sticky top-0 z-20 -mx-4 -mt-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur">
        <Link
          to="/surveys"
          className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeftIcon /> My surveys
        </Link>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} />
          <Button
            onClick={onPublish}
            loading={publish.isPending}
            disabled={status !== "saved"}
            title={status === "saved" ? undefined : "Wait until all changes are saved"}
          >
            Publish
          </Button>
        </div>
      </div>

      {publish.error && <Alert tone="error">{errorMessage(publish.error)}</Alert>}

      <Card className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="survey-title" className="sr-only">
            Survey title
          </label>
          <input
            id="survey-title"
            value={state.title}
            placeholder="Survey title"
            onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
            className={cx(inputClass, "text-xl font-bold", errors.title && invalidInputClass)}
            {...errorProps("survey-title", errors.title)}
          />
          {errors.title && (
            <p id="survey-title-error" className="text-sm text-danger">
              {errors.title}
            </p>
          )}
        </div>
        <Field
          label="Description"
          htmlFor="survey-description"
          hint="Optional. Shown above the questions."
        >
          <textarea
            id="survey-description"
            rows={2}
            value={state.description}
            onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
            className={inputClass}
          />
        </Field>
        <Field
          label="Deadline"
          htmlFor="survey-deadline"
          error={errors.closesAt}
          hint="Optional. The survey stops accepting answers at this time."
        >
          <div className="flex gap-2">
            <input
              id="survey-deadline"
              type="datetime-local"
              value={state.closesAt}
              onChange={(e) => setState((s) => ({ ...s, closesAt: e.target.value }))}
              className={inputBaseClass}
            />
            {state.closesAt && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setState((s) => ({ ...s, closesAt: "" }))}
              >
                Clear
              </Button>
            )}
          </div>
        </Field>
      </Card>

      {errors.questions && <Alert tone="warning">{errors.questions}</Alert>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={state.questions.map((q) => q.key)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {state.questions.map((question, index) => (
              <SortableQuestion
                key={question.key}
                question={question}
                index={index}
                errors={errors}
                canRemove={state.questions.length > 1}
                autoFocus={question.key === lastAddedKey}
                onChange={(next) =>
                  setQuestions((qs) => qs.map((q) => (q.key === next.key ? next : q)))
                }
                onDuplicate={() => {
                  const copy = duplicateQuestion(question);
                  setLastAddedKey(copy.key);
                  setQuestions((qs) => {
                    const at = qs.findIndex((q) => q.key === question.key) + 1;
                    return [...qs.slice(0, at), copy, ...qs.slice(at)];
                  });
                }}
                onRemove={() => setQuestions((qs) => qs.filter((q) => q.key !== question.key))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="rounded-xl border border-dashed border-line-strong p-4">
        <p className="mb-3 text-sm font-medium text-ink-soft">Add a question</p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((type) => (
            <Button key={type} variant="secondary" size="sm" onClick={() => addQuestion(type)}>
              <PlusIcon /> {QUESTION_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
