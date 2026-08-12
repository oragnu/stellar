import { Plus, Trash2 } from "lucide-react";
import {
  isGroupNode,
  type LogicalType,
  type PredicateGroupNode,
  type PredicateNode,
} from "@/queries/usePredicates";
import { PredicateRuleRow } from "@/components/predicates/PredicateRuleRow";
import { defaultOperatorFor, defaultValueFor } from "@/lib/predicateFields";

const LOGICAL_LABELS: Record<LogicalType, string> = {
  all: "All",
  any: "Any",
  none: "None",
};

function newRule(): PredicateNode {
  return { field: "name_with_owner", operator: defaultOperatorFor("string"), value: defaultValueFor("string") };
}

function newGroup(): PredicateNode {
  return { logical_type: "all", rules: [] };
}

interface PredicateGroupBoxProps {
  group: PredicateGroupNode;
  onChange: (group: PredicateGroupNode) => void;
  onRemove?: () => void;
  depth?: number;
}

/** Recursive any/all/none group editor — mirrors
 * backend/app/services/predicate_engine.py's tree-walking evaluator
 * exactly, so whatever tree this builds evaluates the same way it previews.
 */
export function PredicateGroupBox({ group, onChange, onRemove, depth = 0 }: PredicateGroupBoxProps) {
  const updateChild = (index: number, updated: PredicateNode) => {
    const rules = [...group.rules];
    rules[index] = updated;
    onChange({ ...group, rules });
  };

  const removeChild = (index: number) => {
    onChange({ ...group, rules: group.rules.filter((_, i) => i !== index) });
  };

  const addRule = () => onChange({ ...group, rules: [...group.rules, newRule()] });
  const addGroup = () => onChange({ ...group, rules: [...group.rules, newGroup()] });

  return (
    <div
      className={depth > 0 ? "rounded-lg border border-[var(--color-border)] p-3" : ""}
      style={depth > 0 ? { marginLeft: 0 } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Match</span>
        <select
          value={group.logical_type}
          onChange={(e) => onChange({ ...group, logical_type: e.target.value as LogicalType })}
          className="focus-ring rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]"
        >
          {(Object.keys(LOGICAL_LABELS) as LogicalType[]).map((lt) => (
            <option key={lt} value={lt}>
              {LOGICAL_LABELS[lt]}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--color-text-muted)]">of the following:</span>
        {onRemove && (
          <button
            onClick={onRemove}
            aria-label="Remove group"
            className="focus-ring ml-auto rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-2 space-y-2 border-l border-[var(--color-border)] pl-3">
        {group.rules.map((node, index) =>
          isGroupNode(node) ? (
            <PredicateGroupBox
              key={index}
              group={node}
              depth={depth + 1}
              onChange={(updated) => updateChild(index, updated)}
              onRemove={() => removeChild(index)}
            />
          ) : (
            <PredicateRuleRow
              key={index}
              rule={node}
              onChange={(updated) => updateChild(index, updated)}
              onRemove={() => removeChild(index)}
            />
          ),
        )}
        {group.rules.length === 0 && (
          <p className="text-xs italic text-[var(--color-text-muted)]">
            No conditions yet — matches everything.
          </p>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={addRule}
          className="focus-ring flex items-center gap-1 text-xs font-medium text-[var(--color-accent)] hover:underline"
        >
          <Plus aria-hidden="true" className="h-3 w-3" /> Add rule
        </button>
        <button
          onClick={addGroup}
          className="focus-ring flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <Plus aria-hidden="true" className="h-3 w-3" /> Add group
        </button>
      </div>
    </div>
  );
}
