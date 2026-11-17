from __future__ import annotations

from datetime import datetime

import httpx

from jobtracker.adapters import get_json
from jobtracker.adapters.lever import COUNTRY_CODES
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source

PAGE_SIZE = 100
MAX_PAGES = 20


def _label(node: dict, key: str) -> str:
    value = node.get(key) or {}
    return value.get("label", "") if isinstance(value, dict) else ""


def fetch_smartrecruiters(client: httpx.Client, source: Source) -> list[Role]:
    roles: dict[str, Role] = {}
    offset = 0
    for _ in range(MAX_PAGES):
        data = get_json(
            client,
            f"https://api.smartrecruiters.com/v1/companies/{source.board}/postings?limit={PAGE_SIZE}&offset={offset}",
            f"smartrecruiters:{source.board}",
        )
        content = data.get("content") or []
        for post in content:
            pid = str(post.get("id", ""))
            if not pid or pid in roles:
                continue
            loc = post.get("location") or {}
            raw_location = loc.get("fullLocation") or ", ".join(p for p in (loc.get("city"), loc.get("country")) if p)
            city, country, remote = parse_location(raw_location)
            if city is None and loc.get("city"):
                city, _, _ = parse_location(loc["city"])
            if country is None:
                country = COUNTRY_CODES.get((loc.get("country") or "").upper())
            if loc.get("remote") is True:
                remote = True
            released = post.get("releasedDate")
            roles[pid] = Role(
                source="smartrecruiters",
                source_id=pid,
                company=source.name,
                title=post.get("name", ""),
                url=f"https://jobs.smartrecruiters.com/{source.board}/{pid}",
                location_raw=raw_location,
                city=city,
                country=country,
                remote=remote,
                description=" | ".join(
                    x for x in (_label(post, "department"), _label(post, "function"), _label(post, "experienceLevel")) if x
                ),
                posted_at=datetime.fromisoformat(released) if released else None,
            )
        offset += len(content)
        if not content or offset >= int(data.get("totalFound") or 0):
            break
    return list(roles.values())
