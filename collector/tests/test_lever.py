import json
from pathlib import Path

import httpx
import pytest
import respx

from jobtracker.adapters import SourceNotFound
from jobtracker.adapters.lever import fetch_lever
from jobtracker.registry import Source

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "lever.json").read_text())


@respx.mock
def test_fetch_lever_maps_fields():
    respx.get("https://api.lever.co/v0/postings/beta", params={"mode": "json"}).mock(
        return_value=httpx.Response(200, json=FIXTURE)
    )
    with httpx.Client() as client:
        roles = fetch_lever(client, Source("Beta", "lever", "beta", "Basel", "consulting"))
    first = roles[0]
    assert first.source == "lever"
    assert first.source_id == "5ac21346-8e0c-4494-8e7a-3eb92ff77902"
    assert first.title == "Strategy Associate, Life Sciences"
    assert first.url.endswith("5ac21346-8e0c-4494-8e7a-3eb92ff77902")
    assert (first.city, first.country) == ("Basel", "Switzerland")
    assert first.posted_at is not None and first.posted_at.year == 2024
    assert roles[1].posted_at is None and roles[1].location_raw == ""


@respx.mock
def test_fetch_lever_eu_prefix_uses_eu_host():
    route = respx.get("https://api.eu.lever.co/v0/postings/beta", params={"mode": "json"}).mock(
        return_value=httpx.Response(200, json=[])
    )
    with httpx.Client() as client:
        assert fetch_lever(client, Source("Beta", "lever", "eu:beta", "Basel", "consulting")) == []
    assert route.called


@respx.mock
def test_fetch_lever_404_raises_sourcenotfound():
    respx.get("https://api.lever.co/v0/postings/beta", params={"mode": "json"}).mock(
        return_value=httpx.Response(404)
    )
    with httpx.Client() as client, pytest.raises(SourceNotFound):
        fetch_lever(client, Source("Beta", "lever", "beta", "Basel", "consulting"))
