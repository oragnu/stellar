import { useState } from "react";
import { Check } from "lucide-react";
import { useUpdateStarNotes } from "@/queries/useStars";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";

interface NotesEditorProps {
  repoId: number;
  initialNotes: string | null;
  autosaveEnabled: boolean;
}

/** Plain-textarea markdown notes editor with debounced autosave (1s,
 * matching the original app's behavior) when the user has autosave
 * enabled; otherwise an explicit Save button. A richer CodeMirror-based
 * editor (docs/plan.md's long-term plan) can replace this without
 * touching the save logic below.
 */
export function NotesEditor({ repoId, initialNotes, autosaveEnabled }: NotesEditorProps) {
  const [value, setValue] = useState(initialNotes ?? "");
  // Track the notes we last synced from so a fresh `initialNotes` (e.g. after a
  // refetch) is picked up without an effect — switching repos entirely is handled
  // by the parent remounting this component via `key`.
  const [syncedNotes, setSyncedNotes] = useState(initialNotes);
  if (initialNotes !== syncedNotes) {
    setSyncedNotes(initialNotes);
    setValue(initialNotes ?? "");
  }
  const updateNotes = useUpdateStarNotes();

  const debouncedSave = useDebouncedCallback((notes: string) => {
    updateNotes.mutate({ repoId, notes });
  }, 1000);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    if (autosaveEnabled) debouncedSave(e.target.value);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor={`notes-${repoId}`}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
        >
          Notes
        </label>
        <span aria-live="polite" className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
          {autosaveEnabled && updateNotes.isSuccess && (
            <>
              <Check aria-hidden="true" className="h-3 w-3" /> Saved
            </>
          )}
        </span>
      </div>
      <textarea
        id={`notes-${repoId}`}
        value={value}
        onChange={handleChange}
        rows={6}
        placeholder="Why did you star this?"
        className="focus-ring w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
      />
      {!autosaveEnabled && (
        <button
          onClick={() => updateNotes.mutate({ repoId, notes: value })}
          disabled={updateNotes.isPending}
          className="focus-ring mt-2 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {updateNotes.isPending ? "Saving…" : "Save notes"}
        </button>
      )}
    </div>
  );
}
