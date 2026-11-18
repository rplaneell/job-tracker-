import json
from pathlib import Path

import httpx
import pytest
import respx

from jobtracker.adapters import SourceNotFound
from jobtracker.adapters.greenhouse import fetch_greenhouse
from jobtracker.registry import Source

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "greenhouse.json").read_text())
SRC = Source("Acme", "greenhouse", "acme", "Zurich", "consulting")
URL = "https://boards-api.greenhouse.io/v1/boards/acme/jobs"


@respx.mock
def test_fetch_greenhouse_maps_fields():
    respx.get(URL).mock(return_value=httpx.Response(200, json=FIXTURE))
    with httpx.Client() as client:
        roles = fetch_greenhouse(client, SRC)
    first = roles[0]
    assert first.source == "greenhouse"
    assert first.source_id == "127817"
    assert first.company == "Acme"
    assert first.title == "Business Analyst Intern"
    assert first.url == "https://boards.greenhouse.io/acme/jobs/127817"
    assert first.city == "Zurich" and first.country == "Switzerland"
    assert first.description == "Analyse health markets & more."
    assert first.posted_at is not None and first.posted_at.tzinfo is not None
    assert roles[1].city is None and roles[1].location_raw == ""


@respx.mock
def test_fetch_greenhouse_404_raises_sourcenotfound():
    respx.get(URL).mock(return_value=httpx.Response(404))
    with httpx.Client() as client, pytest.raises(SourceNotFound):
        fetch_greenhouse(client, SRC)
