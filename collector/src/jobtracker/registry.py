from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

KINDS = {"greenhouse", "lever", "ashby"}
FIELDS = ("name", "kind", "board", "city", "field")


@dataclass(frozen=True)
class Source:
    name: str
    kind: str
    board: str
    city: str
    field: str


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
        key = (entry["kind"], entry["board"])
        if key in seen:
            raise ValueError(f"{entry['name']}: duplicate board {key}")
        seen.add(key)
        sources.append(Source(**{f: str(entry[f]) for f in FIELDS}))
    return sources
