from __future__ import annotations

from datetime import datetime

import httpx

from jobtracker.adapters import get_json, strip_html
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source


def fetch_greenhouse(client: httpx.Client, source: Source) -> list[Role]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{source.board}/jobs?content=true"
    data = get_json(client, url, f"greenhouse:{source.board}")
    roles = []
    for job in data.get("jobs", []):
        raw_location = (job.get("location") or {}).get("name") or ""
        city, country, remote = parse_location(raw_location)
        updated = job.get("updated_at")
        roles.append(
            Role(
                source="greenhouse",
                source_id=str(job["id"]),
                company=source.name,
                title=job.get("title", ""),
                url=job.get("absolute_url", ""),
                location_raw=raw_location,
                city=city,
                country=country,
                remote=remote,
                description=strip_html(job.get("content") or ""),
                posted_at=datetime.fromisoformat(updated) if updated else None,
            )
        )
    return roles
