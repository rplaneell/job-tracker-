from __future__ import annotations

import re
from dataclasses import dataclass, field
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
    # Profile limit: roles that ask for more years of experience than this are filtered out.
    max_years_experience: int | None = None
    # Countries where only some cities count, for example {Spain: [Barcelona]}. A country not listed here is taken whole.
    city_limits: dict[str, list[str]] = field(default_factory=dict)


def load_rules(path: Path) -> Rules:
    data = yaml.safe_load(Path(path).read_text()) or {}
    for key in REQUIRED:
        if key not in data:
            raise ValueError(f"rules file is missing {key}")
    return Rules(
        **{key: data[key] for key in REQUIRED},
        max_years_experience=data.get("max_years_experience"),
        city_limits=data.get("city_limits") or {},
    )


_YEARS = re.compile(r"(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:to|-|–|—)\s*\d{1,2}\s*\+?\s*)?years?", re.IGNORECASE)


def required_years(text: str) -> int | None:
    """The highest 'N years' requirement mentioned next to the word experience, or None.

    For a range such as '3-5 years' the lower number counts. 'Founded 10 years ago' has no
    experience context, so it is ignored.
    """
    found = []
    for m in _YEARS.finditer(text or ""):
        window = text[max(0, m.start() - 80) : m.end() + 80].lower()
        if "experience" in window:
            found.append(int(m.group(1)))
    return max(found) if found else None


def _has(text: str, keyword: str) -> bool:
    return re.search(rf"(?<![\w]){re.escape(keyword.lower())}(?![\w])", text.lower()) is not None


def _any(text: str, keywords: list[str]) -> bool:
    return any(_has(text, k) for k in keywords)


def in_region(role: Role, rules: Rules) -> bool:
    """Is the role somewhere the owner wants to work? A country with a city limit needs a listed city.

    An unknown city is not trusted unless the raw location text names a listed city as a whole word.
    """
    if role.country not in rules.countries:
        return False
    cities = rules.city_limits.get(role.country)
    if not cities:
        return True
    city = (role.city or "").strip().lower()
    if any(city == c.lower() for c in cities):
        return True
    return any(_has(role.location_raw or "", c) for c in cities)


def matches(role: Role, rules: Rules) -> bool:
    if not in_region(role, rules):
        return False
    if _any(role.title, rules.exclude_keywords):
        return False
    if rules.max_years_experience is not None:
        needed = required_years(role.description)
        if needed is not None and needed > rules.max_years_experience:
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
