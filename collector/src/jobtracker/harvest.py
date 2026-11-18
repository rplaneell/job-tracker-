"""Find company job boards in bulk from the Common Crawl web archive.

Common Crawl publishes a free index of web pages it has seen. Every page on a hiring system's
board address (for example jobs.lever.co/<company>) names a company that uses that system. We
read only the parts of the index that cover those addresses, collect the company names, and
leave checking each board to verify.py (which goes through the compliance gate).

The dataset host says its files are free to download over HTTPS, so these downloads do not go
through the robots gate. Requests are still paced, and nothing here touches the job sites.
"""
from __future__ import annotations

import gzip
import json
import re
import time
from bisect import bisect_left
from dataclasses import dataclass
from typing import Callable, Iterable, Iterator
from urllib.parse import urlsplit

import httpx

DATA_HOST = "https://data.commoncrawl.org"
PAUSE_SECONDS = 1.0

# kind -> index key prefixes. The index sorts pages by a reversed host name, so
# jobs.lever.co/acme is stored as "co,lever,jobs)/acme".
PREFIXES: dict[str, list[str]] = {
    "lever": ["co,lever,jobs)/", "co,lever,eu,jobs)/"],
    "greenhouse": ["io,greenhouse,boards)/", "io,greenhouse,job-boards)/"],
    "ashby": ["com,ashbyhq,jobs)/"],
    "personio": ["de,personio,jobs,"],
    "teamtailor": ["com,teamtailor,"],
}

_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
_RESERVED_PATHS = {"embed", "v1", "api", "static", "assets"}
_RESERVED_TEAMTAILOR = {
    "www", "app", "api", "career", "careers", "support", "docs", "status", "help", "blog",
    "partners", "marketplace", "developers", "cdn", "mail", "go", "info",
}


@dataclass(frozen=True)
class ClusterEntry:
    key: str
    file: str
    offset: int
    length: int


def parse_cluster(text: str) -> list[ClusterEntry]:
    """Read the archive's master index: one line per block of the real index."""
    entries = []
    for line in text.splitlines():
        parts = line.split("\t")
        if len(parts) < 4:
            continue
        try:
            entries.append(ClusterEntry(parts[0].split(" ")[0], parts[1], int(parts[2]), int(parts[3])))
        except ValueError:
            continue
    return entries


def blocks_for_prefix(entries: list[ClusterEntry], prefix: str) -> list[ClusterEntry]:
    """The blocks that can hold keys starting with prefix: the one before the first match, then every match."""
    keys = [e.key for e in entries]
    i = bisect_left(keys, prefix)
    out = [entries[i - 1]] if i > 0 else []
    while i < len(entries) and entries[i].key.startswith(prefix):
        out.append(entries[i])
        i += 1
    return out


def decode_block(raw: bytes) -> list[str]:
    return gzip.decompress(raw).decode("utf-8", errors="replace").splitlines()


def iter_urls(lines: Iterable[str], prefix: str | tuple[str, ...]) -> Iterator[str]:
    """URLs of successful (status 200) pages whose key starts with prefix."""
    for line in lines:
        if not line.startswith(prefix):
            continue
        try:
            record = json.loads(line.split(" ", 2)[2])
        except (IndexError, ValueError):
            continue
        if record.get("status") == "200" and record.get("url"):
            yield record["url"]


def _first_segment(path: str) -> str | None:
    segments = [s for s in path.split("/") if s]
    return segments[0] if segments else None


def slug_from_url(url: str) -> tuple[str, str] | None:
    """(kind, board name) for a page on a known hiring system's board address, else None."""
    try:
        parts = urlsplit(url)
        host = (parts.hostname or "").lower()
    except ValueError:
        return None
    kind = board = None
    if host in ("jobs.lever.co", "jobs.eu.lever.co"):
        name = _first_segment(parts.path)
        kind, board = "lever", (f"eu:{name}" if name and host == "jobs.eu.lever.co" else name)
    elif host in ("boards.greenhouse.io", "job-boards.greenhouse.io"):
        kind, board = "greenhouse", _first_segment(parts.path)
    elif host == "jobs.ashbyhq.com":
        kind, board = "ashby", _first_segment(parts.path)
    elif host.endswith(".jobs.personio.de"):
        sub = host[: -len(".jobs.personio.de")]
        kind, board = "personio", None if "." in sub else sub
    elif host.endswith(".teamtailor.com"):
        sub = host[: -len(".teamtailor.com")]
        kind, board = "teamtailor", None if "." in sub or sub in _RESERVED_TEAMTAILOR else sub
    if not kind or not board:
        return None
    bare = board[3:] if board.startswith("eu:") else board
    if not _NAME.match(bare) or bare.lower() in _RESERVED_PATHS:
        return None
    return kind, board


def harvest_boards(
    client: httpx.Client,
    crawl: str,
    kinds: list[str] | None = None,
    max_blocks: int | None = None,
    sleep: Callable[[float], None] = time.sleep,
    cluster_text: str | None = None,
) -> dict[tuple[str, str], str]:
    """Collect company board names for the given hiring systems from one crawl.

    Returns {(kind, lowercase name): name as first seen}.
    """
    base = f"{DATA_HOST}/cc-index/collections/{crawl}/indexes"
    if cluster_text is None:
        response = client.get(f"{base}/cluster.idx", timeout=600)
        response.raise_for_status()
        cluster_text = response.text
    entries = parse_cluster(cluster_text)
    wanted = {k: PREFIXES[k] for k in (kinds or list(PREFIXES))}
    all_prefixes = tuple(p for prefixes in wanted.values() for p in prefixes)

    blocks: dict[tuple[str, int], ClusterEntry] = {}
    for prefixes in wanted.values():
        for prefix in prefixes:
            for block in blocks_for_prefix(entries, prefix):
                blocks.setdefault((block.file, block.offset), block)
    ordered = sorted(blocks.values(), key=lambda b: (b.file, b.offset))
    if max_blocks is not None:
        ordered = ordered[:max_blocks]

    found: dict[tuple[str, str], str] = {}
    for n, block in enumerate(ordered):
        if n:
            sleep(PAUSE_SECONDS)
        response = client.get(
            f"{base}/{block.file}",
            headers={"Range": f"bytes={block.offset}-{block.offset + block.length - 1}"},
            timeout=300,
        )
        if response.status_code not in (200, 206):
            continue
        try:
            lines = decode_block(response.content)
        except (OSError, EOFError):
            continue  # a damaged block costs us a few boards, nothing more
        for url in iter_urls(lines, all_prefixes):
            hit = slug_from_url(url)
            if hit and hit[0] in wanted:
                found.setdefault((hit[0], hit[1].lower()), hit[1])
    return found
