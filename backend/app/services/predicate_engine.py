"""Evaluates saved "predicate" (smart filter) definitions against merged
star + local-annotation records, in Python rather than via DB-side JSONB
queries — see docs/adr/0002-postgres-primary-sqlite-best-effort.md. Per-user
star counts are small (hundreds to low thousands), so this is fast enough
without needing indexed JSONB containment queries.

Predicate body shape:

    {
      "logical_type": "all" | "any" | "none",
      "rules": [
        {"field": "language", "operator": "is", "value": "Python"},
        {"logical_type": "any", "rules": [...]}   # nested groups allowed
      ]
    }

A "record" passed to `evaluate()` is a plain dict merging the cached GitHub
star fields (see sync_service._normalize_edge) with local annotation fields
the frontend/API layer adds in: `notes: str | None`, `tag_names: list[str]`.
"""

from datetime import datetime
from typing import Any

Rule = dict[str, Any]
Group = dict[str, Any]

_STRING_OPERATORS = {
    "contains": lambda field_val, val: val.lower() in (field_val or "").lower(),
    "not_contains": lambda field_val, val: val.lower() not in (field_val or "").lower(),
    "is": lambda field_val, val: (field_val or "").lower() == (val or "").lower(),
    "is_not": lambda field_val, val: (field_val or "").lower() != (val or "").lower(),
}

_NUMBER_OPERATORS = {
    "equals": lambda field_val, val: field_val == val,
    "greater_than": lambda field_val, val: (field_val or 0) > val,
    "less_than": lambda field_val, val: (field_val or 0) < val,
}

_DATE_OPERATORS = {
    "before": lambda field_val, val: _parse_date(field_val) < _parse_date(val),
    "after": lambda field_val, val: _parse_date(field_val) > _parse_date(val),
}

_STATE_OPERATORS = {
    "is": lambda field_val, val: bool(field_val) == bool(val),
}

_TAGS_OPERATORS = {
    "has_any": lambda field_val, val: bool(set(field_val or []) & set(val or [])),
    "has_all": lambda field_val, val: set(val or []).issubset(set(field_val or [])),
    "has_none": lambda field_val, val: not (set(field_val or []) & set(val or [])),
}

FIELD_KINDS: dict[str, str] = {
    "name_with_owner": "string",
    "description": "string",
    "notes": "string",
    "language": "string",
    "stargazer_count": "number",
    "fork_count": "number",
    "pushed_at": "date",
    "starred_at": "date",
    "is_archived": "state",
    "tag_names": "tags",
}

_OPERATOR_TABLES = {
    "string": _STRING_OPERATORS,
    "number": _NUMBER_OPERATORS,
    "date": _DATE_OPERATORS,
    "state": _STATE_OPERATORS,
    "tags": _TAGS_OPERATORS,
}


def _parse_date(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _evaluate_rule(rule: Rule, record: dict) -> bool:
    field = rule["field"]
    operator = rule["operator"]
    value = rule.get("value")
    kind = FIELD_KINDS.get(field, "string")
    operators = _OPERATOR_TABLES[kind]
    fn = operators.get(operator)
    if fn is None:
        raise ValueError(f"Unknown operator '{operator}' for field '{field}'")
    field_val = record.get(field)
    try:
        return bool(fn(field_val, value))
    except (TypeError, ValueError):
        return False


def _evaluate_group(group: Group, record: dict) -> bool:
    logical_type = group.get("logical_type", "all")
    rules = group.get("rules", [])
    results = [
        _evaluate_group(r, record) if "rules" in r else _evaluate_rule(r, record) for r in rules
    ]
    if not results:
        return True
    if logical_type == "all":
        return all(results)
    if logical_type == "any":
        return any(results)
    if logical_type == "none":
        return not any(results)
    raise ValueError(f"Unknown logical_type '{logical_type}'")


def evaluate(body: Group, records: list[dict]) -> list[dict]:
    """Return the subset of `records` matching the predicate `body`."""
    return [r for r in records if _evaluate_group(body, r)]
