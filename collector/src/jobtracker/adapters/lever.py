from __future__ import annotations

from datetime import datetime, timezone

import httpx

from jobtracker.adapters import get_json
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source

COUNTRY_CODES = {"ES": "Spain", "CH": "Switzerland", "BE": "Belgium", "NL": "Netherlands", "DK": "Denmark"}


def fetch_lever(client: httpx.Client, source: Source) -> list[Role]:
    board = source.board
    host = "api.lever.co"
    if board.startswith("eu:"):
        host, board = "api.eu.lever.co", board[3:]
    data = get_json(client, f"https://{host}/v0/postings/{board}?mode=json", f"lever:{board}")
    roles = []
    for post in data:
        raw_location = (post.get("categories") or {}).get("location") or ""
        city, country, remote = parse_location(raw_location)
        if country is None:
            country = COUNTRY_CODES.get(post.get("country") or "")
        if post.get("workplaceType") == "remote":
            remote = True
        created = post.get("createdAt")
        roles.append(
            Role(
                source="lever",
                source_id=str(post["id"]),
                company=source.name,
                title=post.get("text", ""),
                url=post.get("hostedUrl", ""),
                location_raw=raw_location,
                city=city,
                country=country,
                remote=remote,
                description=post.get("descriptionPlain") or "",
                posted_at=datetime.fromtimestamp(created / 1000, tz=timezone.utc) if created else None,
            )
        )
    return roles
