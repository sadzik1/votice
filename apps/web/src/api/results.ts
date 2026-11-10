import type { Page, SurveyResults, TextAnswer } from "@survey/shared";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiFetch } from "./client.ts";
import { surveyKeys } from "./surveys.ts";

export function useResults(id: string) {
  return useQuery({
    queryKey: surveyKeys.results(id),
    queryFn: () =>
      apiFetch<{ results: SurveyResults }>(`/surveys/${id}/results`).then((r) => r.results),
  });
}

export function useTextAnswers(surveyId: string, questionId: string) {
  return useInfiniteQuery({
    queryKey: surveyKeys.answers(surveyId, questionId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "5" });
      if (pageParam) params.set("cursor", pageParam);
      return apiFetch<Page<TextAnswer>>(
        `/surveys/${surveyId}/questions/${questionId}/answers?${params}`,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useLiveResults(surveyId: string): boolean {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/surveys/${surveyId}/results/stream`, {
      withCredentials: true,
    });
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.addEventListener("response", () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.results(surveyId) });
      void queryClient.invalidateQueries({ queryKey: [...surveyKeys.all, "answers", surveyId] });
    });
    return () => source.close();
  }, [surveyId, queryClient]);

  return connected;
}
