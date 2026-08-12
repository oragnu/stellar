import { useMemo } from "react";
import { Star, Tag as TagIcon } from "lucide-react";
import { useStars } from "@/queries/useStars";
import { useUiStore } from "@/stores/uiStore";
import { TagList } from "@/components/tags/TagList";
import { PredicateList } from "@/components/predicates/PredicateList";

/** Left nav: All Stars / Untagged smart views, user Tags, and derived
 * Language facets — mirrors the original app's sidebar sections. Counts
 * and facets are computed client-side from the full (unfiltered) star
 * list, same query the "All Stars" view itself uses, so no extra
 * server-side aggregation endpoint is needed.
 */
export function Sidebar() {
  const { data, isLoading } = useStars();
  const { selectedView, setSelectedView } = useUiStore();

  const stars = useMemo(() => data?.items ?? [], [data]);
  const untaggedCount = useMemo(
    () => stars.filter((s) => s.tag_ids.length === 0).length,
    [stars],
  );
  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const star of stars) {
      if (!star.language) continue;
      counts.set(star.language, (counts.get(star.language) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [stars]);

  return (
    <aside
      aria-label="Star organization sidebar"
      className="flex h-full flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3"
    >
      <nav aria-label="Smart views" className="space-y-0.5">
        <SidebarButton
          icon={<Star aria-hidden="true" className="h-4 w-4" />}
          label="All Stars"
          count={stars.length}
          loading={isLoading}
          active={selectedView.type === "all"}
          onClick={() => setSelectedView({ type: "all" })}
        />
        <SidebarButton
          icon={<TagIcon aria-hidden="true" className="h-4 w-4" />}
          label="Untagged"
          count={untaggedCount}
          loading={isLoading}
          active={selectedView.type === "untagged"}
          onClick={() => setSelectedView({ type: "untagged" })}
        />
      </nav>

      <SidebarSection title="Tags">
        <TagList />
      </SidebarSection>

      <SidebarSection title="Smart Filters">
        <PredicateList />
      </SidebarSection>

      {languages.length > 0 && (
        <SidebarSection title="Languages">
          <ul className="space-y-0.5">
            {languages.map(([language, count]) => {
              const active = selectedView.type === "language" && selectedView.value === language;
              return (
                <li key={language}>
                  <button
                    onClick={() => setSelectedView({ type: "language", value: language })}
                    className={`focus-ring flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                      active
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated-2)] hover:text-[var(--color-text)]"
                    }`}
                  >
                    <span className="truncate">{language}</span>
                    <span className="opacity-70">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SidebarSection>
      )}
    </aside>
  );
}

function SidebarButton({
  icon,
  label,
  count,
  loading,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  loading?: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "text-[var(--color-text)] hover:bg-[var(--color-bg-elevated-2)]"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      <span className="opacity-70">{loading ? "…" : count}</span>
    </button>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
