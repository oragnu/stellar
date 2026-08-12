import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useDeletePredicate, usePredicates, type Predicate } from "@/queries/usePredicates";
import { useUiStore } from "@/stores/uiStore";
import { PredicateBuilderModal } from "@/components/predicates/PredicateBuilderModal";

export function PredicateList() {
  const { data: predicates, isLoading } = usePredicates();
  const deletePredicate = useDeletePredicate();
  const { selectedView, setSelectedView } = useUiStore();

  const [modalState, setModalState] = useState<{ editing: Predicate | null } | null>(null);

  const handleDelete = (predicate: Predicate) => {
    if (window.confirm(`Delete the smart filter "${predicate.name}"?`)) {
      deletePredicate.mutate(predicate.id, {
        onSuccess: () => {
          if (selectedView.type === "predicate" && selectedView.id === predicate.id) {
            setSelectedView({ type: "all" });
          }
        },
      });
    }
  };

  if (isLoading) {
    return <p className="px-3 text-sm text-[var(--color-text-muted)]">Loading filters…</p>;
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {predicates?.map((predicate) => {
          const isActive = selectedView.type === "predicate" && selectedView.id === predicate.id;
          return (
            <li
              key={predicate.id}
              className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                isActive
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated-2)] hover:text-[var(--color-text)]"
              }`}
            >
              <button
                onClick={() =>
                  setSelectedView({ type: "predicate", id: predicate.id, name: predicate.name })
                }
                className="focus-ring flex-1 truncate text-left"
              >
                {predicate.name}
              </button>
              <span className="hidden items-center gap-1 group-hover:flex">
                <button
                  aria-label={`Edit ${predicate.name}`}
                  onClick={() => setModalState({ editing: predicate })}
                  className="focus-ring rounded p-0.5 hover:opacity-80"
                >
                  <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label={`Delete ${predicate.name}`}
                  onClick={() => handleDelete(predicate)}
                  className="focus-ring rounded p-0.5 hover:opacity-80"
                >
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => setModalState({ editing: null })}
        className="focus-ring mt-1.5 flex items-center gap-1.5 px-2 py-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <Plus aria-hidden="true" className="h-3.5 w-3.5" /> New smart filter
      </button>

      <PredicateBuilderModal
        open={modalState !== null}
        onOpenChange={(open) => !open && setModalState(null)}
        editing={modalState?.editing}
      />
    </div>
  );
}
