from __future__ import annotations

import json
from datetime import datetime, timezone
from html.parser import HTMLParser

import httpx

from jobtracker.adapters import get_text, strip_html
from jobtracker.adapters.lever import COUNTRY_CODES
from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.registry import Source

MAX_BLOCK_CHARS = 2_000_000


class _Blocks(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.blocks: list[str] = []
        self._inside = False

    def handle_starttag(self, tag, attrs):
        if tag == "script" and dict(attrs).get("type", "").lower() == "application/ld+json":
            self._inside = True
            self.blocks.append("")

    def handle_endtag(self, tag):
        if tag == "script":
            self._inside = False

    def handle_data(self, data):
        if self._inside and len(self.blocks[-1]) < MAX_BLOCK_CHARS:
            self.blocks[-1] += data


def _walk(node):
    """Yield every JobPosting found anywhere inside parsed JSON-LD."""
    if isinstance(node, list):
        for item in node:
            yield from _walk(item)
    elif isinstance(node, dict):
        kind = node.get("@type")
        if kind == "JobPosting" or (isinstance(kind, list) and "JobPosting" in kind):
            yield node
        for key in ("@graph", "itemListElement", "item"):
            if key in node:
                yield from _walk(node[key])


def _first(value):
    return value[0] if isinstance(value, list) and value else value


def _location(node: dict) -> tuple[str, str | None]:
    loc = _first(node.get("jobLocation"))
    address = (loc or {}).get("address") if isinstance(loc, dict) else None
    if not isinstance(address, dict):
        return "", None
    country = address.get("addressCountry")
    if isinstance(country, dict):
        country = country.get("name")
    return str(address.get("addressLocality") or ""), (str(country) if country else None)


def _date(value) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def fetch_jsonld(client: httpx.Client, source: Source) -> list[Role]:
    page_url = source.board
    parser = _Blocks()
    parser.feed(get_text(client, page_url, f"jsonld:{page_url}"))
    roles: dict[str, Role] = {}
    for block in parser.blocks:
        try:
            data = json.loads(block)
        except ValueError:
            continue  # one broken block must not hide the others
        for job in _walk(data):
            title = str(job.get("title") or job.get("name") or "")
            url = str(job.get("url") or page_url)
            ident = job.get("identifier")
            ident = ident.get("value") if isinstance(ident, dict) else ident
            sid = str(ident or url)
            if sid in roles or not title:
                continue
            city_text, country_text = _location(job)
            raw_location = ", ".join(p for p in (city_text, country_text) if p)
            city, country, _ = parse_location(raw_location)
            if country is None and country_text:
                country = COUNTRY_CODES.get(country_text.upper())
            if job.get("jobLocationType") == "TELECOMMUTE":
                remote: bool | None = True
            else:
                remote = False if job.get("jobLocation") else None
            roles[sid] = Role(
                source="jsonld",
                source_id=sid,
                company=source.name,
                title=title,
                url=url,
                location_raw=raw_location,
                city=city,
                country=country,
                remote=remote,
                description=strip_html(str(job.get("description") or "")),
                posted_at=_date(job.get("datePosted")) if job.get("datePosted") else None,
            )
    return list(roles.values())
