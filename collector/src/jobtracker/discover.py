from __future__ import annotations

import re
import time
from typing import Callable

import httpx

from jobtracker.adapters import SourceError
from jobtracker.registry import Source

def _json_jobs(r: httpx.Response) -> int:
    data = r.json()
    return len(data.get("jobs", [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0


def _sr_jobs(r: httpx.Response) -> int:
    return len(r.json().get("content") or [])


# (kind, board prefix, url template, how to count jobs in the response)
PROBES = [
    ("greenhouse", "", "https://boards-api.greenhouse.io/v1/boards/{b}/jobs", _json_jobs),
    ("lever", "", "https://api.lever.co/v0/postings/{b}?mode=json", _json_jobs),
    ("lever", "eu:", "https://api.eu.lever.co/v0/postings/{b}?mode=json", _json_jobs),
    ("ashby", "", "https://api.ashbyhq.com/posting-api/job-board/{b}", _json_jobs),
    ("personio", "", "https://{b}.jobs.personio.de/xml?language=en", lambda r: r.text.count("<position>")),
    ("teamtailor", "", "https://{b}.teamtailor.com/jobs.rss", lambda r: r.text.count("<item>")),
    ("smartrecruiters", "", "https://api.smartrecruiters.com/v1/companies/{b}/postings?limit=1", _sr_jobs),
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
    """Try the known public boards for a company name. At most 14 requests."""
    for slug in _slugs(company_guess):
        for kind, prefix, template, count in PROBES:
            pause(1.0)
            try:
                response = client.get(template.format(b=slug), timeout=20)
                if response.status_code != 200 or count(response) < 1:
                    continue
            except (httpx.HTTPError, SourceError, ValueError):
                continue  # includes a robots.txt refusal: that board is simply not usable
            return Source(company_guess, kind, f"{prefix}{slug}", city, field)
    return None
