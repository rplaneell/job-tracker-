import json
from pathlib import Path

import httpx
import pytest
import respx

from jobtracker.adapters import SourceNotFound
from jobtracker.adapters.ashby import fetch_ashby
from jobtracker.registry import Source

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "ashby.json").read_text())
SRC = Source("Gamma", "ashby", "gamma", "Copenhagen", "vc")
URL = "https://api.ashbyhq.com/posting-api/job-board/gamma"


@respx.mock
def test_fetch_ashby_maps_fields():
    respx.get(URL).mock(return_value=httpx.Response(200, json=FIXTURE))
    with httpx.Client() as client:
        roles = fetch_ashby(client, SRC)
    first, remote = roles[0], roles[1]
    assert first.source == "ashby"
    assert first.source_id == "https://jobs.ashbyhq.com/gamma/111"
    assert first.url == "https://jobs.ashbyhq.com/gamma/111"
    assert (first.city, first.country, first.remote) == ("Copenhagen", "Denmark", False)
    assert first.posted_at is not None and first.posted_at.year == 2026
    assert remote.remote is True and remote.posted_at is None


@respx.mock
def test_fetch_ashby_skips_unlisted_jobs():
    respx.get(URL).mock(return_value=httpx.Response(200, json=FIXTURE))
    with httpx.Client() as client:
        titles = [r.title for r in fetch_ashby(client, SRC)]
    assert "Hidden Role" not in titles and len(titles) == 2


@respx.mock
def test_fetch_ashby_404_raises_sourcenotfound():
    respx.get(URL).mock(return_value=httpx.Response(404))
    with httpx.Client() as client, pytest.raises(SourceNotFound):
        fetch_ashby(client, SRC)
