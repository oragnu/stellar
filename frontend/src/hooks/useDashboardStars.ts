import { useMemo } from "react";
import { useStars } from "@/queries/useStars";
import { useUiStore } from "@/stores/uiStore";
import type { StarFilters } from "@/queries/useStars";

/** Translates the selected sidebar view into server-side filters, fetches
 * that slice, then applies the free-text search client-side — same split
 * the original app used (fast local search over an already-fetched list).
 */
export function useDashboardStars() {
  const { selectedView, searchQuery } = useUiStore();

  const filters = useMemo<Omit<StarFilters, "q">>(() => {
    switch (selectedView.type) {
      case "tag":
        return { tagId: selectedView.id };
      case "untagged":
        return { untagged: true };
      case "language":
        return { language: selectedView.value };
      case "predicate":
        return { predicateId: selectedView.id };
      default:
        return {};
    }
  }, [selectedView]);

  const query = useStars(filters);

  const filteredItems = useMemo(() => {
    const items = query.data?.items ?? [];
    if (!searchQuery.trim()) return items;
    const needle = searchQuery.trim().toLowerCase();
    return items.filter(
      (star) =>
        star.name_with_owner.toLowerCase().includes(needle) ||
        (star.description ?? "").toLowerCase().includes(needle) ||
        (star.notes ?? "").toLowerCase().includes(needle) ||
        star.tag_names.some((t) => t.toLowerCase().includes(needle)),
    );
  }, [query.data, searchQuery]);

  return { ...query, items: filteredItems };
}
