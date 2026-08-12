import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StarRecord } from "@/queries/useStars";

/** Mirrors backend/app/services/predicate_engine.py's body shape exactly —
 * keep FIELD_KINDS/operators here in sync with that module if either
 * changes. A leaf rule has no `rules` key; a group does (that's how the
 * backend discriminates the two while walking the tree, and the frontend
 * builder follows the same convention).
 */
export type LogicalType = "all" | "any" | "none";

export interface PredicateRuleNode {
  field: string;
  operator: string;
  value: unknown;
}

export interface PredicateGroupNode {
  logical_type: LogicalType;
  rules: PredicateNode[];
}

export type PredicateNode = PredicateRuleNode | PredicateGroupNode;

export function isGroupNode(node: PredicateNode): node is PredicateGroupNode {
  return "rules" in node;
}

export interface Predicate {
  id: string;
  name: string;
  body: PredicateGroupNode;
  sort_order: number;
  created_at: string;
}

export function useEmptyPredicateBody(): PredicateGroupNode {
  return { logical_type: "all", rules: [] };
}

export function usePredicates() {
  return useQuery<Predicate[]>({
    queryKey: ["predicates"],
    queryFn: () => api.get<Predicate[]>("/predicates"),
    staleTime: 60_000,
  });
}

function invalidatePredicates(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["predicates"] });
}

export function useCreatePredicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; body: PredicateGroupNode }) =>
      api.post<Predicate>("/predicates", body),
    onSuccess: () => invalidatePredicates(queryClient),
  });
}

export function useUpdatePredicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, body }: { id: string; name?: string; body?: PredicateGroupNode }) =>
      api.patch<Predicate>(`/predicates/${id}`, { name, body }),
    onSuccess: () => invalidatePredicates(queryClient),
  });
}

export function useDeletePredicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/predicates/${id}`),
    onSuccess: () => invalidatePredicates(queryClient),
  });
}

export function useReorderPredicates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.put<void>("/predicates/reorder", { ordered_ids: orderedIds }),
    onSuccess: () => invalidatePredicates(queryClient),
  });
}

/** Live preview for the builder modal — evaluates an unsaved body against
 * the user's current cached stars server-side (same predicate_engine.py
 * the saved-predicate filter uses), so the preview and the real filter can
 * never disagree.
 */
export function usePreviewPredicate() {
  return useMutation({
    mutationFn: (body: PredicateGroupNode) =>
      api.post<StarRecord[]>("/predicates/preview", { body }),
  });
}
