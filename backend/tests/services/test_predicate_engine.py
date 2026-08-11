from app.services.predicate_engine import evaluate

RECORDS = [
    {"name_with_owner": "a/one", "language": "Python", "stargazer_count": 500, "tag_names": ["ml"]},
    {"name_with_owner": "b/two", "language": "Go", "stargazer_count": 10, "tag_names": []},
    {
        "name_with_owner": "c/three",
        "language": "Python",
        "stargazer_count": 5,
        "tag_names": ["cli"],
    },
]


def test_simple_string_rule():
    body = {
        "logical_type": "all",
        "rules": [{"field": "language", "operator": "is", "value": "Python"}],
    }
    result = evaluate(body, RECORDS)
    assert {r["name_with_owner"] for r in result} == {"a/one", "c/three"}


def test_number_rule():
    body = {
        "logical_type": "all",
        "rules": [{"field": "stargazer_count", "operator": "greater_than", "value": 100}],
    }
    result = evaluate(body, RECORDS)
    assert [r["name_with_owner"] for r in result] == ["a/one"]


def test_any_logical_type():
    body = {
        "logical_type": "any",
        "rules": [
            {"field": "language", "operator": "is", "value": "Go"},
            {"field": "stargazer_count", "operator": "greater_than", "value": 400},
        ],
    }
    result = evaluate(body, RECORDS)
    assert {r["name_with_owner"] for r in result} == {"a/one", "b/two"}


def test_none_logical_type():
    body = {
        "logical_type": "none",
        "rules": [{"field": "language", "operator": "is", "value": "Python"}],
    }
    result = evaluate(body, RECORDS)
    assert [r["name_with_owner"] for r in result] == ["b/two"]


def test_nested_groups():
    body = {
        "logical_type": "all",
        "rules": [
            {"field": "language", "operator": "is", "value": "Python"},
            {
                "logical_type": "any",
                "rules": [{"field": "tag_names", "operator": "has_any", "value": ["cli"]}],
            },
        ],
    }
    result = evaluate(body, RECORDS)
    assert [r["name_with_owner"] for r in result] == ["c/three"]


def test_tags_operator():
    body = {
        "logical_type": "all",
        "rules": [{"field": "tag_names", "operator": "has_any", "value": ["ml"]}],
    }
    result = evaluate(body, RECORDS)
    assert [r["name_with_owner"] for r in result] == ["a/one"]


def test_empty_group_matches_everything():
    body = {"logical_type": "all", "rules": []}
    result = evaluate(body, RECORDS)
    assert len(result) == len(RECORDS)
