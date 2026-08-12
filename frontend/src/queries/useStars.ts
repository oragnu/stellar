import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface StarRecord {
  repo_id: number;
  name_with_owner: string;
  description: string | null;
  url: string;
  is_archived: boolean;
  pushed_at: string | null;
  default_branch: string | null;
  language: string | null;
  stargazer_count: number;
  fork_count: number;
  topics: string[];
  latest_release_tag: string | null;
  starred_at: string | null;
  notes: string | null;
  tag_names: string[];
  tag_ids: string[];
}

export interface StarListResponse {
  items: StarRecord[];
  meta: { total: number };
}

export interface StarFilters {
  tagId?: string;
  predicateId?: string;
  untagged?: boolean;
  q?: string;
  language?: string;
}

function buildQuery(filters: StarFilters): string {
  const params = new URLSearchParams();
  if (filters.tagId) params.set("tag_id", filters.tagId);
  if (filters.predicateId) params.set("predicate_id", filters.predicateId);
  if (filters.untagged) params.set("untagged", "true");
  if (filters.q) params.set("q", filters.q);
  if (filters.language) params.set("language", filters.language);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Server-side filters (tag/predicate/untagged/language) hit the API;
 * free-text search is applied client-side over the already-fetched list
 * (see useFilteredStars) so keystrokes don't round-trip — matching the
 * original app's fast client-side "Galileo" search.
 */
export function useStars(filters: Omit<StarFilters, "q"> = {}) {
  return useQuery<StarListResponse>({
    queryKey: ["stars", filters],
    queryFn: () => api.get<StarListResponse>(`/stars${buildQuery(filters)}`),
    staleTime: 60_000,
  });
}

export function useSyncStars() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<StarListResponse>("/stars/sync"),
    onSuccess: () => {
      // The sync endpoint refreshes the server-side cache for the
      // *unfiltered* list; any active filtered views (by tag/language/etc.)
      // need their own refetch against that freshly-synced cache.
      queryClient.invalidateQueries({ queryKey: ["stars"] });
    },
  });
}

export function useUpdateStarNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ repoId, notes }: { repoId: number; notes: string }) =>
      api.patch<StarRecord>(`/stars/${repoId}`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stars"] });
    },
  });
}

export function useBulkTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { repo_ids: number[]; add_tag_ids?: string[]; remove_tag_ids?: string[] }) =>
      api.post<void>("/stars/bulk-tag", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stars"] });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useReadme(repoId: number | null, nameWithOwner: string | null) {
  return useQuery<{ html: string | null }>({
    queryKey: ["readme", repoId],
    queryFn: () =>
      api.get<{ html: string | null }>(
        `/stars/${repoId}/readme?name_with_owner=${encodeURIComponent(nameWithOwner ?? "")}`,
      ),
    enabled: repoId !== null && !!nameWithOwner,
    staleTime: 5 * 60_000,
  });
}
