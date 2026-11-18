from __future__ import annotations

from datetime import datetime

import httpx
from defusedxml import ElementTree as ET
from defusedxml.common import DefusedXmlException

from jobtracker.adapters import SourceError, get_text, strip_html
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source


def _text(node, tag: str) -> str:
    child = node.find(tag)
    return (child.text or "").strip() if child is not None else ""


def fetch_personio(client: httpx.Client, source: Source) -> list[Role]:
    host = f"{source.board}.jobs.personio.de"
    body = get_text(client, f"https://{host}/xml?language=en", f"personio:{source.board}")
    try:
        root = ET.fromstring(body)  # defusedxml refuses entity tricks
    except (ET.ParseError, DefusedXmlException, ValueError) as exc:
        raise SourceError(f"personio:{source.board}: unreadable feed ({type(exc).__name__})") from exc
    roles: dict[str, Role] = {}
    for pos in root.findall("position"):
        pid = _text(pos, "id")
        if not pid or pid in roles:
            continue
        office = _text(pos, "office")
        city, country, remote = parse_location(office)
        parts = [strip_html(v.text or "") for v in pos.findall("jobDescriptions/jobDescription/value")]
        created = _text(pos, "createdAt")
        try:
            posted = datetime.fromisoformat(created) if created else None
        except ValueError:
            posted = None
        roles[pid] = Role(
            source="personio",
            source_id=pid,
            company=source.name,
            title=_text(pos, "name"),
            url=f"https://{host}/job/{pid}",
            location_raw=office,
            city=city,
            country=country,
            remote=remote,
            description=" ".join(p for p in parts if p),
            posted_at=posted,
        )
    return list(roles.values())
