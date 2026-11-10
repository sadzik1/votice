import { useParams } from "react-router";
import { useSurvey } from "../api/surveys.ts";
import { QueryError } from "../components/QueryError.tsx";
import { PageSpinner } from "../components/ui.tsx";
import { SurveyBuilder } from "../features/builder/SurveyBuilder.tsx";
import { SurveyOverview } from "../features/share/SurveyOverview.tsx";

export function SurveyEditorPage() {
  const { id = "" } = useParams();
  const survey = useSurvey(id);

  if (survey.isPending) return <PageSpinner />;
  if (survey.isError) return <QueryError error={survey.error} />;

  return survey.data.status === "DRAFT" ? (
    <SurveyBuilder key={survey.data.id} survey={survey.data} />
  ) : (
    <SurveyOverview survey={survey.data} />
  );
}
