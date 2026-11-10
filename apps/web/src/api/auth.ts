import type { LoginInput, PublicUser, RegisterInput } from "@survey/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, apiFetch, sendJson } from "./client.ts";

export const meQueryKey = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<PublicUser | null> => {
      try {
        return (await apiFetch<{ user: PublicUser }>("/auth/me")).user;
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      sendJson<{ user: PublicUser }>("POST", "/auth/login", input).then((r) => r.user),
    onSuccess: (user) => queryClient.setQueryData(meQueryKey, user),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      sendJson<{ user: PublicUser }>("POST", "/auth/register", input).then((r) => r.user),
    onSuccess: (user) => queryClient.setQueryData(meQueryKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<null>("POST", "/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(meQueryKey, null);
    },
  });
}
