from __future__ import annotations

import html
import json
import re
from html.parser import HTMLParser

import httpx


class SourceError(Exception):
    """A source could not be read. `status` is the HTTP status if there was one."""

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


class SourceNotFound(SourceError):
    """The company board does not exist (HTTP 404)."""


class _Text(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def strip_html(text: str) -> str:
    """Turn (possibly entity escaped) HTML into plain text."""
    if not text:
        return ""
    parser = _Text()
    parser.feed(html.unescape(text))  # Greenhouse sends the markup entity escaped
    plain = html.unescape("".join(parser.parts))
    return re.sub(r"\s+", " ", plain).strip()


def get_text(client: httpx.Client, url: str, what: str) -> str:
    try:
        response = client.get(url, timeout=30)
    except SourceError:
        raise
    except httpx.HTTPError as exc:
        raise SourceError(f"{what}: {exc}") from exc
    if response.status_code == 404:
        raise SourceNotFound(f"{what}: board not found", 404)
    if response.status_code >= 400:
        raise SourceError(f"{what}: HTTP {response.status_code}", response.status_code)
    return response.text


def get_json(client: httpx.Client, url: str, what: str) -> object:
    text = get_text(client, url, what)
    try:
        return json.loads(text)
    except ValueError as exc:
        raise SourceError(f"{what}: invalid JSON") from exc


_WEB_LINK = re.compile(r"^https?://[^\s<>\"'`]+$", re.IGNORECASE)
MAX_URL_LENGTH = 2000


def safe_url(url: str) -> str:
    """A plain web link, or an empty string. Links come from outside, so javascript:, data: and relative links never pass."""
    cleaned = (url or "").strip()
    if len(cleaned) > MAX_URL_LENGTH or not _WEB_LINK.match(cleaned):
        return ""
    return cleaned
