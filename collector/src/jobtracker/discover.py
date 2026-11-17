from __future__ import annotations

import re
import time
from typing import Callable

import httpx

from jobtracker.registry import Source

# (kind, board prefix, url template, how to count jobs in the JSON)
PROBES = [
    ("greenhouse", "", "https://boards-api.greenhouse.io/v1/boards/{b}/jobs", lambda d: len(d.get("jobs", []))),
    ("lever", "", "https://api.lever.co/v0/postings/{b}?mode=json", lambda d: len(d) if isinstance(d, list) else 0),
    ("lever", "eu:", "https://api.eu.lever.co/v0/postings/{b}?mode=json", lambda d: len(d) if isinstance(d, list) else 0),
    ("ashby", "", "https://api.ashbyhq.com/posting-api/job-board/{b}", lambda d: len(d.get("jobs", []))),
]


def _slugs(guess: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", guess.lower())
    variants = ["".join(words), "-".join(words)]
    return [v for i, v in enumerate(variants) if v and v not in variants[:i]]


def discover_board(
    client: httpx.Client,
    company_guess: str,
    city: str = "",
    field: str = "",
    pause: Callable[[float], None] = time.sleep,
) -> Source | None:
    """Try the known public boards for a company name. At most 8 requests."""
    for slug in _slugs(company_guess):
        for kind, prefix, template, count in PROBES:
            pause(1.0)
            try:
                response = client.get(template.format(b=slug), timeout=20)
                if response.status_code != 200 or count(response.json()) < 1:
                    continue
            except (httpx.HTTPError, ValueError):
                continue
            return Source(company_guess, kind, f"{prefix}{slug}", city, field)
    return None
