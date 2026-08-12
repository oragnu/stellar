import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { PredicateGroupBox } from "@/components/predicates/PredicateGroupBox";
import {
  useCreatePredicate,
  useEmptyPredicateBody,
  usePreviewPredicate,
  useUpdatePredicate,
  type Predicate,
  type PredicateGroupNode,
} from "@/queries/usePredicates";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";

interface PredicateBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pass an existing predicate to edit it; omit to create a new one. */
  editing?: Predicate | null;
}

export function PredicateBuilderModal({ open, onOpenChange, editing }: PredicateBuilderModalProps) {
  const emptyBody = useEmptyPredicateBody();
  const [name, setName] = useState("");
  const [body, setBody] = useState<PredicateGroupNode>(emptyBody);

  const createPredicate = useCreatePredicate();
  const updatePredicate = useUpdatePredicate();
  const preview = usePreviewPredicate();

  // Reset the form whenever the modal opens for a (possibly different) predicate.
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setBody(editing?.body ?? { logical_type: "all", rules: [] });
    }
  }, [open, editing]);

  const debouncedPreview = useDebouncedCallback((nextBody: PredicateGroupNode) => {
    if (nextBody.rules.length > 0) preview.mutate(nextBody);
  }, 400);

  useEffect(() => {
    if (open) debouncedPreview(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debouncedPreview is stable across renders
  }, [body, open]);

  const isSaving = createPredicate.isPending || updatePredicate.isPending;
  const canSave = name.trim().length > 0 && !isSaving;

  const handleSave = () => {
    if (!canSave) return;
    if (editing) {
      updatePredicate.mutate(
        { id: editing.id, name: name.trim(), body },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createPredicate.mutate(
        { name: name.trim(), body },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  };

  const saveError = createPredicate.error ?? updatePredicate.error;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? "Edit smart filter" : "New smart filter"}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unmaintained Python libs"
            className="focus-ring w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Conditions
          </label>
          <PredicateGroupBox group={body} onChange={setBody} />
        </div>

        <div className="rounded-md bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
          {preview.isPending ? (
            "Checking matches…"
          ) : preview.data ? (
            <>
              Matches <span className="font-semibold text-[var(--color-text)]">{preview.data.length}</span>{" "}
              star{preview.data.length === 1 ? "" : "s"}
              {preview.data.length > 0 && (
                <span className="block truncate text-xs">
                  {preview.data
                    .slice(0, 5)
                    .map((s) => s.name_with_owner)
                    .join(", ")}
                  {preview.data.length > 5 ? "…" : ""}
                </span>
              )}
            </>
          ) : (
            "Add a condition to see a live preview."
          )}
        </div>

        {saveError && (
          <p className="text-sm text-[var(--color-danger)]">
            {(saveError as Error).message || "Couldn't save this filter."}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-md px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="focus-ring rounded-md bg-[var(--color-primary)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {isSaving ? "Saving…" : editing ? "Save changes" : "Create filter"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
