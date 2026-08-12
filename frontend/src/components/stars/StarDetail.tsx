import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useDashboardStars } from "@/hooks/useDashboardStars";
import { useBulkTag, type StarRecord } from "@/queries/useStars";
import { useCreateTag, useTags } from "@/queries/useTags";
import { useCurrentUser } from "@/queries/useCurrentUser";
import { TagChip } from "@/components/tags/TagChip";
import { NotesEditor } from "@/components/notes/NotesEditor";
import { ReadmePane } from "@/components/stars/ReadmePane";

export function StarDetail() {
  const { selectedRepoId } = useUiStore();
  const { items } = useDashboardStars();

  const star = items.find((s) => s.repo_id === selectedRepoId);

  if (!selectedRepoId || !star) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--color-text-muted)]">
        Select a repo to see its README, notes, and tags.
      </div>
    );
  }

  return <StarDetailContent star={star} />;
}

function StarDetailContent({ star }: { star: StarRecord }) {
  const { data: user } = useCurrentUser();
  const { data: allTags } = useTags();
  const createTag = useCreateTag();
  const bulkTag = useBulkTag();
  const [tagInput, setTagInput] = useState("");

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = tagInput.trim();
    if (!name) return;
    setTagInput("");

    const existing = allTags?.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      bulkTag.mutate({ repo_ids: [star.repo_id], add_tag_ids: [existing.id] });
    } else {
      createTag.mutate(name, {
        onSuccess: (tag) => bulkTag.mutate({ repo_ids: [star.repo_id], add_tag_ids: [tag.id] }),
      });
    }
  };

  const removeTag = (tagId: string) => {
    bulkTag.mutate({ repo_ids: [star.repo_id], remove_tag_ids: [tagId] });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{star.name_with_owner}</h2>
          {star.description && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{star.description}</p>
          )}
        </div>
        <a
          href={star.url}
          target="_blank"
          rel="noreferrer"
          className="focus-ring flex shrink-0 items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /> GitHub
        </a>
      </div>

      <input
        readOnly
        value={`git clone ${star.url}.git`}
        onFocus={(e) => e.target.select()}
        aria-label="Git clone URL"
        className="focus-ring mt-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 font-mono text-xs text-[var(--color-text-muted)]"
      />

      <div className="mt-4">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {star.tag_names.map((name, i) => (
            <TagChip key={star.tag_ids[i]} name={name} onRemove={() => removeTag(star.tag_ids[i])} />
          ))}
        </div>
        <form onSubmit={addTag} className="flex items-center gap-1">
          <Plus aria-hidden="true" className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <input
            list="all-tag-names"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add a tag…"
            aria-label="Add a tag to this repo"
            className="focus-ring rounded bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
          />
          <datalist id="all-tag-names">
            {allTags?.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
        </form>
      </div>

      <div className="mt-5">
        <NotesEditor
          repoId={star.repo_id}
          initialNotes={star.notes}
          autosaveEnabled={user?.autosave_notes ?? true}
        />
      </div>

      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        <ReadmePane repoId={star.repo_id} nameWithOwner={star.name_with_owner} />
      </div>
    </div>
  );
}
