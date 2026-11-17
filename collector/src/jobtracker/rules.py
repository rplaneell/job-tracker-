from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from jobtracker.models import Role

REQUIRED = ("countries", "include_keywords", "exclude_keywords", "field_keywords", "level_keywords")


@dataclass(frozen=True)
class Rules:
    countries: list[str]
    include_keywords: list[str]
    exclude_keywords: list[str]
    field_keywords: dict[str, list[str]]
    level_keywords: dict[str, list[str]]


def load_rules(path: Path) -> Rules:
    data = yaml.safe_load(Path(path).read_text()) or {}
    for key in REQUIRED:
        if key not in data:
            raise ValueError(f"rules file is missing {key}")
    return Rules(**{key: data[key] for key in REQUIRED})


def _has(text: str, keyword: str) -> bool:
    return re.search(rf"(?<![\w]){re.escape(keyword.lower())}(?![\w])", text.lower()) is not None


def _any(text: str, keywords: list[str]) -> bool:
    return any(_has(text, k) for k in keywords)


def matches(role: Role, rules: Rules) -> bool:
    if role.country not in rules.countries:
        return False
    if _any(role.title, rules.exclude_keywords):
        return False
    return _any(role.title, rules.include_keywords)


def _tag(role: Role, table: dict[str, list[str]]) -> str | None:
    text = f"{role.title} {role.description}"
    for tag, keywords in table.items():
        if _any(text, keywords):
            return tag
    return None


def tag_field(role: Role, rules: Rules) -> str | None:
    return _tag(role, rules.field_keywords)


def tag_level(role: Role, rules: Rules) -> str | None:
    return _tag(role, rules.level_keywords)
