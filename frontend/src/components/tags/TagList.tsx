import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCreateTag, useDeleteTag, useRenameTag, useTags } from "@/queries/useTags";
import { useUiStore } from "@/stores/uiStore";

export function TagList() {
  const { data: tags, isLoading } = useTags();
  const createTag = useCreateTag();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();
  const { selectedView, setSelectedView } = useUiStore();

  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    createTag.mutate(name, { onSuccess: () => setNewTagName("") });
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const commitRename = (id: string) => {
    const name = editingName.trim();
    setEditingId(null);
    if (name) renameTag.mutate({ id, name });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete tag "${name}"? This removes it from every starred repo.`)) {
      deleteTag.mutate(id);
    }
  };

  if (isLoading) {
    return <p className="px-3 text-sm text-[var(--color-text-muted)]">Loading tags…</p>;
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {tags?.map((tag) => {
          const isActive = selectedView.type === "tag" && selectedView.id === tag.id;
          const isEditing = editingId === tag.id;
          return (
            <li
              key={tag.id}
              className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                isActive
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated-2)] hover:text-[var(--color-text)]"
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded bg-[var(--color-bg)] px-1.5 py-0.5 text-[var(--color-text)] focus-ring"
                />
              ) : (
                <>
                  <button
                    onClick={() => setSelectedView({ type: "tag", id: tag.id, name: tag.name })}
                    className="focus-ring flex-1 truncate text-left"
                  >
                    {tag.name} <span className="opacity-70">({tag.star_count})</span>
                  </button>
                  <span className="hidden items-center gap-1 group-hover:flex">
                    <button
                      aria-label={`Rename ${tag.name}`}
                      onClick={() => startRename(tag.id, tag.name)}
                      className="focus-ring rounded p-0.5 hover:opacity-80"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label={`Delete ${tag.name}`}
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="focus-ring rounded p-0.5 hover:opacity-80"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleCreate} className="mt-1.5 flex items-center gap-1 px-2">
        <Plus className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        <input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="New tag"
          className="focus-ring w-full rounded bg-transparent py-1 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
        />
      </form>
    </div>
  );
}
