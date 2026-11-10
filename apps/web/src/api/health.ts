import type { HealthResponse } from "@survey/shared";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client.ts";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/health"),
    refetchInterval: 15_000,
    retry: false,
  });
}
