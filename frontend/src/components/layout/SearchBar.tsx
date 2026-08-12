import { useRef } from "react";
import { Search, RefreshCw } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useSyncStars } from "@/queries/useStars";

/** "Galileo" search bar — client-side filtering (see useFilteredStars),
 * plus a manual sync trigger and the `/` keyboard shortcut to focus.
 */
export function SearchBar() {
  const { searchQuery, setSearchQuery } = useUiStore();
  const sync = useSyncStars();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-6 py-3">
      <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
      <input
        ref={inputRef}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Gaze through your telescope…"
        className="focus-ring w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
      />
      <button
        onClick={() => sync.mutate()}
        disabled={sync.isPending}
        className="focus-ring flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${sync.isPending ? "animate-spin" : ""}`} />
        {sync.isPending ? "Syncing…" : "Refresh"}
      </button>
    </div>
  );
}
