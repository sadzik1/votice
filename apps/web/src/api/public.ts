import type { PublicSurveyResponse, ResponseInput } from "@survey/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch, sendJson } from "./client.ts";

export function usePublicSurvey(slug: string) {
  return useQuery({
    queryKey: ["public-survey", slug],
    queryFn: () => apiFetch<PublicSurveyResponse>(`/public/surveys/${slug}`),
    retry: false,
  });
}

export function useSubmitResponse(slug: string) {
  return useMutation({
    mutationFn: (input: ResponseInput) =>
      sendJson<{ ok: true }>("POST", `/public/surveys/${slug}/responses`, input),
  });
}
