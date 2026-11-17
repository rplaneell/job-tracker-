import json
from pathlib import Path

import httpx
import respx

from jobtracker.adapters.jsonld import fetch_jsonld
from jobtracker.registry import Source

PAGE = (Path(__file__).parent / "fixtures" / "jsonld_page.html").read_text()
URL = "https://acme.example/careers"
SRC = Source("Acme", "jsonld", URL, "Basel", "consulting", terms="ok", basis="reviewed 2026-11-17")


def page(*blocks):
    scripts = "".join(f'<script type="application/ld+json">{b}</script>' for b in blocks)
    return f"<html><head>{scripts}</head><body></body></html>"


def run(html):
    respx.get(URL).mock(return_value=httpx.Response(200, text=html))
    with httpx.Client() as client:
        return fetch_jsonld(client, SRC)


@respx.mock
def test_jsonld_single_jobposting():
    (role,) = run(PAGE)
    assert role.source == "jsonld" and role.source_id == "REQ-42"
    assert role.title == "Healthcare Strategy Analyst"
    assert role.url == "https://acme.example/careers/analyst"
    assert (role.city, role.country, role.remote) == ("Basel", "Switzerland", False)
    assert role.description == "Advise hospital clients."
    assert role.posted_at is not None and role.posted_at.tzinfo is not None and role.posted_at.day == 3


@respx.mock
def test_jsonld_graph_and_itemlist():
    graph = json.dumps({"@graph": [{"@type": "WebPage"}, {"@type": "JobPosting", "title": "A", "url": "https://x/a"}]})
    itemlist = json.dumps(
        {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "item": {"@type": "JobPosting", "title": "B", "url": "https://x/b"}}]}
    )
    roles = run(page(graph, itemlist))
    assert sorted(r.title for r in roles) == ["A", "B"]


@respx.mock
def test_jsonld_invalid_json_block_is_skipped_not_fatal():
    good = json.dumps({"@type": "JobPosting", "title": "A", "url": "https://x/a"})
    assert [r.title for r in run(page("{not json", good))] == ["A"]


@respx.mock
def test_jsonld_page_without_jobs_returns_empty():
    assert run("<html><body>No jobs</body></html>") == []
    assert run(page(json.dumps({"@type": "Organization", "name": "Acme"}))) == []


@respx.mock
def test_jsonld_location_as_list_and_string_country():
    block = json.dumps({
        "@type": "JobPosting", "title": "A", "url": "https://x/a",
        "jobLocation": [{"address": {"addressLocality": "Copenhagen", "addressCountry": {"@type": "Country", "name": "Denmark"}}}],
    })
    (role,) = run(page(block))
    assert (role.city, role.country) == ("Copenhagen", "Denmark")


@respx.mock
def test_jsonld_remote_and_missing_date():
    block = json.dumps({"@type": "JobPosting", "title": "A", "url": "https://x/a", "jobLocationType": "TELECOMMUTE"})
    (role,) = run(page(block))
    assert role.remote is True and role.posted_at is None and role.location_raw == ""


@respx.mock
def test_jsonld_duplicate_postings_returned_once():
    block = json.dumps({"@type": "JobPosting", "title": "A", "url": "https://x/a"})
    assert len(run(page(block, block))) == 1
