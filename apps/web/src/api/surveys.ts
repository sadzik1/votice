import type { SurveyDetail, SurveyInput, SurveyStatus, SurveySummary } from "@survey/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, sendJson } from "./client.ts";

export const surveyKeys = {
  all: ["surveys"] as const,
  list: () => [...surveyKeys.all, "list"] as const,
  detail: (id: string) => [...surveyKeys.all, "detail", id] as const,
  results: (id: string) => [...surveyKeys.all, "results", id] as const,
  answers: (id: string, questionId: string) =>
    [...surveyKeys.all, "answers", id, questionId] as const,
};

export function useSurveys() {
  return useQuery({
    queryKey: surveyKeys.list(),
    queryFn: () => apiFetch<{ surveys: SurveySummary[] }>("/surveys").then((r) => r.surveys),
  });
}

export function useSurvey(id: string) {
  return useQuery({
    queryKey: surveyKeys.detail(id),
    queryFn: () => apiFetch<{ survey: SurveyDetail }>(`/surveys/${id}`).then((r) => r.survey),
  });
}

export function useCreateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SurveyInput) =>
      sendJson<{ survey: SurveyDetail }>("POST", "/surveys", input).then((r) => r.survey),
    onSuccess: (survey) => {
      queryClient.setQueryData(surveyKeys.detail(survey.id), survey);
      void queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
    },
  });
}

// don't push the saved copy back into the form, it would reset the cursor
export function useSaveSurvey(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SurveyInput) =>
      sendJson<{ survey: SurveyDetail }>("PUT", `/surveys/${id}`, input).then((r) => r.survey),
    onSuccess: (survey) => {
      queryClient.setQueryData(surveyKeys.detail(id), survey);
      void queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
    },
  });
}

export function useChangeStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: SurveyStatus) =>
      sendJson<{ survey: SurveyDetail }>("POST", `/surveys/${id}/status`, { status }).then(
        (r) => r.survey,
      ),
    onSuccess: (survey) => {
      queryClient.setQueryData(surveyKeys.detail(id), survey);
      void queryClient.invalidateQueries({ queryKey: surveyKeys.list() });
    },
  });
}

export function useDeleteSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendJson<null>("DELETE", `/surveys/${id}`),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<SurveySummary[]>(surveyKeys.list(), (list) =>
        list?.filter((s) => s.id !== id),
      );
      queryClient.removeQueries({ queryKey: surveyKeys.detail(id) });
    },
  });
}
