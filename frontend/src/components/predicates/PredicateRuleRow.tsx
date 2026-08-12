import { useState } from "react";
import { X } from "lucide-react";
import {
  PREDICATE_FIELDS,
  OPERATORS_BY_KIND,
  fieldKind,
  defaultOperatorFor,
  defaultValueFor,
} from "@/lib/predicateFields";
import type { PredicateRuleNode } from "@/queries/usePredicates";
import { useTags } from "@/queries/useTags";
import { TagChip } from "@/components/tags/TagChip";

interface PredicateRuleRowProps {
  rule: PredicateRuleNode;
  onChange: (rule: PredicateRuleNode) => void;
  onRemove: () => void;
}

const inputClass =
  "focus-ring rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-sm text-[var(--color-text)]";

export function PredicateRuleRow({ rule, onChange, onRemove }: PredicateRuleRowProps) {
  const kind = fieldKind(rule.field);

  const handleFieldChange = (field: string) => {
    const newKind = fieldKind(field);
    if (newKind === kind) {
      onChange({ ...rule, field });
    } else {
      // Field kind changed (e.g. "language" -> "stars") — the old
      // operator/value no longer make sense for the new kind, so reset both.
      onChange({ field, operator: defaultOperatorFor(newKind), value: defaultValueFor(newKind) });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={rule.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className={inputClass}
      >
        {PREDICATE_FIELDS.map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value })}
        className={inputClass}
      >
        {OPERATORS_BY_KIND[kind].map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <ValueInput kind={kind} value={rule.value} onChange={(value) => onChange({ ...rule, value })} />

      <button
        onClick={onRemove}
        aria-label="Remove rule"
        className="focus-ring ml-auto rounded p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ValueInput({
  kind,
  value,
  onChange,
}: {
  kind: ReturnType<typeof fieldKind>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (kind) {
    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${inputClass} w-24`}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      );
    case "state":
      return (
        <select
          value={value ? "true" : "false"}
          onChange={(e) => onChange(e.target.value === "true")}
          className={inputClass}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case "tags":
      return (
        <TagsValueInput
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );
    default:
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="value…"
          className={`${inputClass} min-w-32 flex-1`}
        />
      );
  }
}

function TagsValueInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const { data: tags } = useTags();
  const [input, setInput] = useState("");

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = input.trim();
    setInput("");
    if (name && !value.includes(name)) onChange([...value, name]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {value.map((name) => (
        <TagChip key={name} name={name} onRemove={() => onChange(value.filter((v) => v !== name))} />
      ))}
      <form onSubmit={addTag}>
        <input
          list="predicate-tag-names"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="+ tag"
          className={`${inputClass} w-20`}
        />
        <datalist id="predicate-tag-names">
          {tags?.map((t) => <option key={t.id} value={t.name} />)}
        </datalist>
      </form>
    </div>
  );
}
