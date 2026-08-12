import { useCurrentUser } from "@/queries/useCurrentUser";
import { Header } from "@/components/layout/Header";
import { SearchBar } from "@/components/layout/SearchBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { StarList } from "@/components/stars/StarList";
import { StarDetail } from "@/components/stars/StarDetail";
import { SettingsModal } from "@/components/settings/SettingsModal";

/** Main app shell — CSS grid matching the original app's proportions:
 * 72px header, 64px search bar, 280px sidebar, 400px star list, flexible
 * detail pane. Phases 1-2 of docs/plan.md land here; the predicate builder
 * (Phase 3) is the next major addition to this shell.
 */
export function Dashboard() {
  const { data: user, isLoading } = useCurrentUser();

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
      <div className="col-start-2 row-start-3 border-r border-[var(--color-border)]">
        <StarList />
      </div>
      <div className="col-start-3 row-start-3">
        <StarDetail />
      </div>
      <SettingsModal />
    </div>
  );
}
