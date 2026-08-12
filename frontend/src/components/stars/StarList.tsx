import { useDashboardStars } from "@/hooks/useDashboardStars";
import { useUiStore } from "@/stores/uiStore";
import { StarListItem } from "@/components/stars/StarListItem";

/** NOTE: renders the filtered list directly rather than through
 * @tanstack/react-virtual — fine for the list sizes exercised so far;
 * virtualization is still the plan (docs/plan.md § Frontend Architecture)
 * once this is exercised against a multi-thousand-star account.
 */
export function StarList() {
  const { items, isLoading, isError } = useDashboardStars();
  const { selectedRepoId, selectStar } = useUiStore();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
        Loading stars…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--color-danger)]">
        Couldn't load your stars. Try refreshing.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--color-text-muted)]">
        No starred repos match this view yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {items.map((star) => (
        <StarListItem
          key={star.repo_id}
          star={star}
          active={star.repo_id === selectedRepoId}
          onClick={() => selectStar(star.repo_id)}
        />
      ))}
    </div>
  );
}
