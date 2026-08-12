/** Field/operator catalog for the predicate builder UI — must stay in sync
 * with backend/app/services/predicate_engine.py's FIELD_KINDS and operator
 * tables. The backend is the source of truth for evaluation; this just
 * needs to emit bodies shaped the way that module expects.
 */

export type FieldKind = "string" | "number" | "date" | "state" | "tags";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
}

export const PREDICATE_FIELDS: FieldDef[] = [
  { key: "name_with_owner", label: "Repo name", kind: "string" },
  { key: "description", label: "Description", kind: "string" },
  { key: "notes", label: "Notes", kind: "string" },
  { key: "language", label: "Language", kind: "string" },
  { key: "stargazer_count", label: "Stars", kind: "number" },
  { key: "fork_count", label: "Forks", kind: "number" },
  { key: "pushed_at", label: "Last pushed", kind: "date" },
  { key: "starred_at", label: "Starred at", kind: "date" },
  { key: "is_archived", label: "Archived", kind: "state" },
  { key: "tag_names", label: "Tags", kind: "tags" },
];

export const OPERATORS_BY_KIND: Record<FieldKind, { value: string; label: string }[]> = {
  string: [
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "doesn't contain" },
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "greater_than", label: ">" },
    { value: "less_than", label: "<" },
  ],
  date: [
    { value: "before", label: "before" },
    { value: "after", label: "after" },
  ],
  state: [{ value: "is", label: "is" }],
  tags: [
    { value: "has_any", label: "has any of" },
    { value: "has_all", label: "has all of" },
    { value: "has_none", label: "has none of" },
  ],
};

export function fieldKind(fieldKey: string): FieldKind {
  return PREDICATE_FIELDS.find((f) => f.key === fieldKey)?.kind ?? "string";
}

export function defaultOperatorFor(kind: FieldKind): string {
  return OPERATORS_BY_KIND[kind][0].value;
}

export function defaultValueFor(kind: FieldKind): unknown {
  switch (kind) {
    case "number":
      return 0;
    case "state":
      return true;
    case "tags":
      return [];
    case "date":
      return new Date().toISOString().slice(0, 10);
    default:
      return "";
  }
}
