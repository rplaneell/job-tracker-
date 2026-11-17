from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

KINDS = {"greenhouse", "lever", "ashby", "personio", "teamtailor", "smartrecruiters", "jsonld"}
TERMS = {"ok", "no", "unreviewed"}
FIELDS = ("name", "kind", "board", "city", "field")


@dataclass(frozen=True)
class Source:
    name: str
    kind: str
    board: str
    city: str
    field: str
    terms: str = "ok"  # result of the terms of use review: ok, no or unreviewed
    basis: str = ""  # why: for example "official public API" or "reviewed 2026-11-17"


def load_sources(path: Path) -> list[Source]:
    data = yaml.safe_load(Path(path).read_text()) or []
    sources: list[Source] = []
    seen: set[tuple[str, str]] = set()
    for entry in data:
        missing = [f for f in FIELDS if f not in entry]
        if missing:
            raise ValueError(f"{entry.get('name', '?')}: missing {missing}")
        if entry["kind"] not in KINDS:
            raise ValueError(f"{entry['name']}: unknown kind {entry['kind']!r}")
        terms = str(entry.get("terms", "unreviewed" if entry["kind"] == "jsonld" else "ok"))
        if terms not in TERMS:
            raise ValueError(f"{entry['name']}: terms must be one of {sorted(TERMS)}, got {terms!r}")
        if entry["kind"] == "jsonld" and terms != "ok":
            raise ValueError(f"{entry['name']}: reading career pages needs terms: ok after a terms review")
        if terms == "no":
            continue  # kept in the file as a record, never collected
        key = (entry["kind"], entry["board"])
        if key in seen:
            raise ValueError(f"{entry['name']}: duplicate board {key}")
        seen.add(key)
        sources.append(
            Source(**{f: str(entry[f]) for f in FIELDS}, terms=terms, basis=str(entry.get("basis", "")))
        )
    return sources
