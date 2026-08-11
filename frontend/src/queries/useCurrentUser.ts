import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";

export interface CurrentUser {
  id: string;
  github_login: string;
  avatar_url: string | null;
  autotag_topics: boolean;
  show_language_tags: boolean;
  autosave_notes: boolean;
  created_at: string;
}

/** Hydrates auth state from GET /auth/me. A 401 means "not logged in" —
 * treated as a normal (non-error) empty state rather than a query failure,
 * so the UI can render a login screen instead of an error boundary.
 */
export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.get<CurrentUser>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });
}
