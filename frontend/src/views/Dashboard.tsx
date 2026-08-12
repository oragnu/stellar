import { useCurrentUser } from "@/queries/useCurrentUser";
import { useDashboardStars } from "@/hooks/useDashboardStars";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/layout/SearchBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { StarList } from "@/components/stars/StarList";
import { StarDetail } from "@/components/stars/StarDetail";
import { SettingsModal } from "@/components/settings/SettingsModal";

/** Main app shell — CSS grid matching the original app's proportions:
 * 72px header, 64px search bar, 280px sidebar, 400px star list, flexible
 * detail pane. Phases 1-3 of docs/plan.md land here.
 */
export function Dashboard() {
  const { data: user, isLoading } = useCurrentUser();
  // Shares its query cache with StarList's own call (same queryKey), so
  // this doesn't cost an extra request — it just gives the keyboard
  // shortcut hook the same filtered/searched list the list is rendering.
  const { items } = useDashboardStars();
  useKeyboardShortcuts(items);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="grid h-screen grid-cols-[280px_400px_1fr] grid-rows-[72px_56px_1fr] bg-[var(--color-bg)]">
      <div className="col-span-3">
        <Header user={user} />
      </div>
      <div className="col-span-2 col-start-2">
        <SearchBar />
      </div>
      <div className="row-start-2 row-span-2">
        <Sidebar />
      </div>
      {/* display:contents keeps these two panes as direct grid items of the
          outer grid (same placement as before) while still giving the pair
          a <main> landmark for screen-reader / skip-navigation purposes. */}
      <main className="contents">
        <div
          className="col-start-2 row-start-3 border-r border-[var(--color-border)]"
          aria-label="Starred repositories"
        >
          <StarList />
        </div>
        <div className="col-start-3 row-start-3" aria-label="Repository details">
          <StarDetail />
        </div>
      </main>
      <SettingsModal />
    </div>
  );
}
