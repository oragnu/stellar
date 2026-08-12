import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CurrentUser } from "@/queries/useCurrentUser";

export interface SettingsUpdate {
  autotag_topics?: boolean;
  show_language_tags?: boolean;
  autosave_notes?: boolean;
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SettingsUpdate) => api.patch<CurrentUser>("/settings", body),
    onSuccess: (user) => {
      queryClient.setQueryData(["auth", "me"], user);
    },
  });
}

export function useRunAutotag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ applied_count: number }>("/settings/autotag/run"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stars"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api.delete<void>("/auth/account"),
  });
}
