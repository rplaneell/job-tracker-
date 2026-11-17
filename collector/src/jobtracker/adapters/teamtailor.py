from __future__ import annotations

from datetime import datetime
from email.utils import parsedate_to_datetime

import httpx
from defusedxml import ElementTree as ET
from defusedxml.common import DefusedXmlException

from jobtracker.adapters import SourceError, get_text, strip_html
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source

TT = "{https://teamtailor.com/locations}"


def _text(node, tag: str) -> str:
    child = node.find(tag)
    return (child.text or "").strip() if child is not None else ""


def _posted(value: str) -> datetime | None:
    try:
        return parsedate_to_datetime(value) if value else None
    except (TypeError, ValueError):
        return None


def fetch_teamtailor(client: httpx.Client, source: Source) -> list[Role]:
    body = get_text(client, f"https://{source.board}.teamtailor.com/jobs.rss", f"teamtailor:{source.board}")
    try:
        root = ET.fromstring(body)
    except (ET.ParseError, DefusedXmlException, ValueError) as exc:
        raise SourceError(f"teamtailor:{source.board}: unreadable feed ({type(exc).__name__})") from exc
    roles: dict[str, Role] = {}
    for item in root.iter("item"):
        guid = _text(item, "guid")
        if not guid or guid in roles:
            continue
        loc = item.find(f"{TT}locations/{TT}location")
        city_text = _text(loc, f"{TT}city") if loc is not None else ""
        country_text = _text(loc, f"{TT}country") if loc is not None else ""
        raw_location = ", ".join(p for p in (city_text, country_text) if p)
        city, country, remote = parse_location(raw_location)
        status = _text(item, "remoteStatus")
        if status:
            remote = status == "fully"
        roles[guid] = Role(
            source="teamtailor",
            source_id=guid,
            company=source.name,
            title=_text(item, "title"),
            url=_text(item, "link"),
            location_raw=raw_location,
            city=city,
            country=country,
            remote=remote,
            description=strip_html(_text(item, "description")),
            posted_at=_posted(_text(item, "pubDate")),
        )
    return list(roles.values())
