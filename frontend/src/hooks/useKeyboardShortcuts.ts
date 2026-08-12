import { useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import type { StarRecord } from "@/queries/useStars";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

/** Radix's Dialog renders with role="dialog" and already owns Escape/focus
 * trapping while open — we defer to it entirely rather than double-handling
 * keys underneath an open modal.
 */
function isModalOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null;
}

/** Dashboard-level shortcuts: `/` focus search, `j`/`k` (or arrow keys)
 * navigate the star list, `t` focus the sidebar's new-tag input, `Escape`
 * clears the search or blurs the active field. Registered once at the
 * Dashboard root — see docs/plan.md's Frontend Architecture section.
 */
export function useKeyboardShortcuts(items: StarRecord[]) {
  const searchQuery = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const selectedRepoId = useUiStore((s) => s.selectedRepoId);
  const selectStar = useUiStore((s) => s.selectStar);

  useEffect(() => {
    function moveSelection(delta: number) {
      if (items.length === 0) return;
      const currentIndex = items.findIndex((s) => s.repo_id === selectedRepoId);
      const nextIndex =
        currentIndex === -1 ? 0 : Math.min(Math.max(currentIndex + delta, 0), items.length - 1);
      selectStar(items[nextIndex].repo_id);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isModalOpen()) return;

      if (e.key === "Escape") {
        if (isTypingTarget(e.target)) e.target.blur();
        if (searchQuery) setSearchQuery("");
        return;
      }

      // Every other shortcut is a single printable-ish key — don't steal
      // it while the user is actually typing somewhere.
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          document.getElementById("stellar-search-input")?.focus();
          break;
        case "t":
          e.preventDefault();
          document.getElementById("stellar-new-tag-input")?.focus();
          break;
        case "j":
        case "ArrowDown":
          e.preventDefault();
          moveSelection(1);
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          moveSelection(-1);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, searchQuery, setSearchQuery, selectedRepoId, selectStar]);
}
