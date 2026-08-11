import { Logo } from "@/components/ui/Logo";
import { useCurrentUser } from "@/queries/useCurrentUser";

/**
 * Placeholder shell — the full dashboard (sidebar, virtualized star list,
 * detail pane, predicate builder) is built out across Phases 1-3 of
 * docs/plan.md. This proves the authenticated route + API wiring works
 * end-to-end.
 */
export function Dashboard() {
  const { data: user } = useCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <Logo />
        {user && (
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt={user.github_login}
                className="h-8 w-8 rounded-full"
              />
            )}
            <span>{user.github_login}</span>
          </div>
        )}
      </header>
      <main className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          Your dashboard is under construction
        </h1>
        <p className="max-w-md text-[var(--color-text-muted)]">
          Tags, notes, smart filters, and your starred repos will show up here
          as Stellar's core features ship — see{" "}
          <code className="rounded bg-[var(--color-bg-elevated)] px-1.5 py-0.5">
            docs/plan.md
          </code>{" "}
          for the roadmap.
        </p>
      </main>
    </div>
  );
}
