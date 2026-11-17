import json
from pathlib import Path

import httpx
import pytest
import respx

from jobtracker.adapters import SourceNotFound
from jobtracker.adapters.smartrecruiters import fetch_smartrecruiters
from jobtracker.registry import Source

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "smartrecruiters.json").read_text())
SRC = Source("Acme", "smartrecruiters", "acme", "Zurich", "consulting")
URL = "https://api.smartrecruiters.com/v1/companies/acme/postings"


def run():
    with httpx.Client() as client:
        return fetch_smartrecruiters(client, SRC)


@respx.mock
def test_fetch_smartrecruiters_maps_fields():
    respx.get(URL).mock(return_value=httpx.Response(200, json=FIXTURE))
    first, second = run()
    assert first.source == "smartrecruiters"
    assert first.source_id == "744000158320111"
    assert first.url == "https://jobs.smartrecruiters.com/acme/744000158320111"
    assert first.title == "Strategy Associate, Life Sciences"
    assert (first.city, first.country, first.remote) == ("Zurich", "Switzerland", False)
    assert "Strategy" in first.description and "Consulting" in first.description
    assert first.posted_at is not None and first.posted_at.year == 2026
    assert second.remote is True and second.posted_at is None and second.country is None


@respx.mock
def test_fetch_smartrecruiters_country_code_used_when_text_has_no_country():
    data = {"totalFound": 1, "content": [{"id": "1", "name": "Analyst", "location": {"city": "Ghent", "country": "be"}}]}
    respx.get(URL).mock(return_value=httpx.Response(200, json=data))
    assert run()[0].country == "Belgium"


@respx.mock
def test_fetch_smartrecruiters_follows_paging():
    def page(request):
        offset = int(request.url.params["offset"])
        size = min(100, 150 - offset)
        items = [{"id": str(offset + i), "name": "Analyst", "location": {}} for i in range(size)]
        return httpx.Response(200, json={"offset": offset, "limit": 100, "totalFound": 150, "content": items})

    respx.get(URL).mock(side_effect=page)
    assert len(run()) == 150


@respx.mock
def test_fetch_smartrecruiters_page_cap():
    def endless(request):
        offset = int(request.url.params["offset"])
        items = [{"id": str(offset + i), "name": "A", "location": {}} for i in range(100)]
        return httpx.Response(200, json={"totalFound": 10**9, "content": items})

    route = respx.get(URL).mock(side_effect=endless)
    assert len(run()) == 2000 and route.call_count == 20


@respx.mock
def test_fetch_smartrecruiters_empty_company():
    respx.get(URL).mock(return_value=httpx.Response(200, json={"totalFound": 0, "content": []}))
    assert run() == []


@respx.mock
def test_fetch_smartrecruiters_404_raises_sourcenotfound():
    respx.get(URL).mock(return_value=httpx.Response(404))
    with pytest.raises(SourceNotFound):
        run()
