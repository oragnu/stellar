import { Search, RefreshCw } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useSyncStars } from "@/queries/useStars";

/** "Galileo" search bar — client-side filtering (see useDashboardStars),
 * plus a manual sync trigger. Focused by the `/` shortcut
 * (hooks/useKeyboardShortcuts.ts) via its id, since the shortcut handler
 * lives outside this component's render tree.
 */
export function SearchBar() {
  const { searchQuery, setSearchQuery } = useUiStore();
  const sync = useSyncStars();

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-3">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
      <input
        id="stellar-search-input"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Gaze through your telescope…"
        aria-label="Search your stars"
        className="focus-ring w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
      />
      <button
        onClick={() => sync.mutate()}
        disabled={sync.isPending}
        aria-label={sync.isPending ? "Syncing your stars" : "Refresh your stars from GitHub"}
        className="focus-ring flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50"
      >
        <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
        <span aria-live="polite">{sync.isPending ? "Syncing…" : "Refresh"}</span>
      </button>
    </div>
  );
}
