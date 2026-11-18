from __future__ import annotations

from datetime import datetime

import httpx

from jobtracker.adapters import get_json
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source


def fetch_ashby(client: httpx.Client, source: Source) -> list[Role]:
    data = get_json(
        client,
        f"https://api.ashbyhq.com/posting-api/job-board/{source.board}",
        f"ashby:{source.board}",
    )
    roles = []
    for job in data.get("jobs", []):
        if job.get("isListed") is False:
            continue
        raw_location = job.get("location") or ""
        city, country, remote = parse_location(raw_location)
        postal = (job.get("address") or {}).get("postalAddress") or {}
        if postal.get("addressLocality") and not city:
            city = postal["addressLocality"]
        if postal.get("addressCountry") and not country:
            country = postal["addressCountry"]
        if job.get("isRemote") is True:
            remote = True
        elif job.get("isRemote") is False and remote is None:
            remote = False
        published = job.get("publishedAt")
        url = job.get("jobUrl", "")
        roles.append(
            Role(
                source="ashby",
                source_id=url,
                company=source.name,
                title=job.get("title", ""),
                url=url,
                location_raw=raw_location,
                city=city,
                country=country,
                remote=remote,
                description=job.get("descriptionPlain") or "",
                posted_at=datetime.fromisoformat(published) if published else None,
            )
        )
    return roles
