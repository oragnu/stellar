import { Star, GitFork, Archive } from "lucide-react";
import type { StarRecord } from "@/queries/useStars";
import { TagChip } from "@/components/tags/TagChip";

interface StarListItemProps {
  star: StarRecord;
  active: boolean;
  onClick: () => void;
}

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function StarListItem({ star, active, onClick }: StarListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`focus-ring w-full border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors ${
        active ? "bg-[var(--color-bg-elevated-2)]" : "hover:bg-[var(--color-bg-elevated)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`truncate font-medium ${
            star.is_archived ? "text-[var(--color-text-muted)]" : "text-[var(--color-accent)]"
          }`}
        >
          {star.name_with_owner}
        </span>
        {star.is_archived && (
          <span title="Archived">
            <Archive
              aria-label="Archived"
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]"
            />
          </span>
        )}
      </div>
      {star.description && (
        <p className="mt-0.5 line-clamp-2 text-sm text-[var(--color-text-muted)]">
          {star.description}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
        {star.language && <span>{star.language}</span>}
        <span className="flex items-center gap-1" aria-label={`${star.stargazer_count.toLocaleString()} stars`}>
          <Star aria-hidden="true" className="h-3 w-3" /> {star.stargazer_count.toLocaleString()}
        </span>
        <span className="flex items-center gap-1" aria-label={`${star.fork_count.toLocaleString()} forks`}>
          <GitFork aria-hidden="true" className="h-3 w-3" /> {star.fork_count.toLocaleString()}
        </span>
        {relativeTime(star.pushed_at) && <span>pushed {relativeTime(star.pushed_at)}</span>}
      </div>
      {star.tag_names.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {star.tag_names.map((name) => (
            <TagChip key={name} name={name} />
          ))}
        </div>
      )}
    </button>
  );
}
