import { describe, expect, it } from "vitest";
import {
  PREDICATE_FIELDS,
  OPERATORS_BY_KIND,
  fieldKind,
  defaultOperatorFor,
  defaultValueFor,
} from "@/lib/predicateFields";

describe("predicateFields", () => {
  it("maps every field key to a kind with a non-empty operator list", () => {
    for (const field of PREDICATE_FIELDS) {
      expect(OPERATORS_BY_KIND[field.kind].length).toBeGreaterThan(0);
    }
  });

  it("falls back to 'string' for an unknown field key", () => {
    expect(fieldKind("some_unknown_field")).toBe("string");
  });

  it("resolves the documented kind for each backend field", () => {
    // Mirrors backend/app/services/predicate_engine.py's FIELD_KINDS —
    // if this drifts, the builder would offer operators the backend
    // doesn't support for that field.
    expect(fieldKind("name_with_owner")).toBe("string");
    expect(fieldKind("language")).toBe("string");
    expect(fieldKind("stargazer_count")).toBe("number");
    expect(fieldKind("fork_count")).toBe("number");
    expect(fieldKind("pushed_at")).toBe("date");
    expect(fieldKind("starred_at")).toBe("date");
    expect(fieldKind("is_archived")).toBe("state");
    expect(fieldKind("tag_names")).toBe("tags");
  });

  it("returns a default operator that is actually valid for that kind", () => {
    for (const kind of Object.keys(OPERATORS_BY_KIND) as Array<keyof typeof OPERATORS_BY_KIND>) {
      const op = defaultOperatorFor(kind);
      expect(OPERATORS_BY_KIND[kind].map((o) => o.value)).toContain(op);
    }
  });

  it("returns type-appropriate default values", () => {
    expect(defaultValueFor("number")).toBe(0);
    expect(defaultValueFor("state")).toBe(true);
    expect(defaultValueFor("tags")).toEqual([]);
    expect(typeof defaultValueFor("date")).toBe("string");
    expect(defaultValueFor("string")).toBe("");
  });
});
