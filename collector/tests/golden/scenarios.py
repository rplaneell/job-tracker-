"""Inputs and settings for the backtest of the collector's decisions.

REAL: 178 job titles from a live run (company, title, country, city). Public postings, no descriptions kept.
EDGE: hand written cases for what real titles do not cover (experience wording, odd text).
SCENARIOS: the shipped rules.yaml (the default) plus every setting a person can change.
"""
import json
from dataclasses import replace
from pathlib import Path

from jobtracker.models import Role
from jobtracker.rules import load_rules, matches, tag_field, tag_level

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]

EDGE = [
    ("Edge Co", "Business Analyst Intern", "Spain", "Barcelona", "No experience needed, we train you."),
    ("Edge Co", "Business Analyst", "Spain", "Barcelona", "You have 5+ years of experience in consulting."),
    ("Edge Co", "Business Analyst", "Spain", "Barcelona", "1 year of experience is a plus."),
    ("Edge Co", "Business Analyst", "Spain", "Barcelona", "Requires 2 years of experience."),
    ("Edge Co", "Business Analyst", "Spain", "Barcelona", "3 years of experience required."),
    ("Edge Co", "Business Analyst", "Spain", "Barcelona", "Founded 10 years ago, we grew fast."),
    ("Edge Co", "Strategy Associate, Life Sciences", "Switzerland", "Basel", "3 to 5 years' experience in biotech."),
    ("Edge Co", "Graduate Consultant", "Denmark", "Copenhagen", "Join our biotech and healthcare team."),
    ("Edge Co", "Senior Consultant", "Netherlands", "Amsterdam", ""),
    ("Edge Co", "Team Lead, Consulting", "Netherlands", "Amsterdam", ""),
    ("Edge Co", "Internal Auditor", "Belgium", "Brussels", ""),
    ("Edge Co", "INVESTMENT ANALYST", "Switzerland", "Zurich", "Venture capital fund, life sciences."),
    ("Edge Co", "Analyst", "France", "Paris", "Outside the target countries."),
    ("Edge Co", "Analyst", None, None, "No country stated."),
    ("Edge Co", "Zürich Analyst <b>Intern</b>", "Switzerland", "Zurich", "Hostile looking title stays plain text."),
    ("Edge Co", "", "Spain", "Madrid", ""),
]


def real_roles() -> list[Role]:
    rows = json.loads((HERE / "real_roles.json").read_text())
    return [Role("real", str(i), r["company"], r["title"], "https://x", "", r["city"], r["country"], None, "", None) for i, r in enumerate(rows)]


def edge_roles() -> list[Role]:
    return [Role("edge", str(i), c, t, "https://x", "", city, country, None, desc, None) for i, (c, t, country, city, desc) in enumerate(EDGE)]


def all_roles() -> list[Role]:
    return real_roles() + edge_roles()


def base_rules():
    return load_rules(REPO / "rules.yaml")


def scenarios():
    base = base_rules()
    return {
        "default": base,
        "no_experience_limit": replace(base, max_years_experience=None),
        "experience_limit_0": replace(base, max_years_experience=0),
        "experience_limit_5": replace(base, max_years_experience=5),
        "spain_only": replace(base, countries=["Spain"]),
        "no_exclusions": replace(base, exclude_keywords=[]),
        "only_intern_titles": replace(base, include_keywords=["intern", "internship"]),
    }


def render(rules, roles) -> str:
    lines = []
    for r in roles:
        lines.append(" | ".join([
            f"{r.company}", f"{r.title}", f"{r.country}",
            "MATCH" if matches(r, rules) else "no",
            f"field={tag_field(r, rules)}", f"level={tag_level(r, rules)}",
        ]))
    return "\n".join(lines) + "\n"
