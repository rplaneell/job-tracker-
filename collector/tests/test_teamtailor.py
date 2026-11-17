from pathlib import Path

import httpx
import pytest
import respx

from jobtracker.adapters import SourceError, SourceNotFound
from jobtracker.adapters.teamtailor import fetch_teamtailor
from jobtracker.registry import Source

FIXTURE = (Path(__file__).parent / "fixtures" / "teamtailor.xml").read_text()
SRC = Source("Acme", "teamtailor", "acme", "Copenhagen", "consulting")
URL = "https://acme.teamtailor.com/jobs.rss"
RSS = '<rss version="2.0" xmlns:tt="https://teamtailor.com/locations"><channel>{}</channel></rss>'


def serve(text, status=200):
    respx.get(URL).mock(return_value=httpx.Response(status, text=text))


def run():
    with httpx.Client() as client:
        return fetch_teamtailor(client, SRC)


@respx.mock
def test_fetch_teamtailor_maps_fields():
    serve(FIXTURE)
    first = run()[0]
    assert first.source == "teamtailor"
    assert first.source_id == "b5508148-ada5-4a7e-b2cb-55a3fd123a6f"
    assert first.title == "Enterprise Account Executive - Chicago"
    assert first.url.startswith("https://career.teamtailor.com/jobs/8706432")
    assert first.location_raw == "Chicago, United States"
    assert first.remote is False
    assert "<" not in first.description and "Analyse markets" in first.description
    assert first.posted_at is not None and first.posted_at.tzinfo is not None
    assert (first.posted_at.year, first.posted_at.month, first.posted_at.day) == (2026, 11, 11)


@respx.mock
def test_fetch_teamtailor_target_city_is_recognised():
    item = (
        "<item><title>Analyst</title><guid>g1</guid><link>https://x/1</link>"
        "<tt:locations><tt:location><tt:city>Copenhagen</tt:city><tt:country>Denmark</tt:country></tt:location></tt:locations></item>"
    )
    serve(RSS.format(item))
    role = run()[0]
    assert (role.city, role.country) == ("Copenhagen", "Denmark")


@respx.mock
def test_fetch_teamtailor_item_without_location_or_date():
    serve(RSS.format("<item><title>Analyst</title><guid>g1</guid><link>https://x/1</link></item>"))
    role = run()[0]
    assert role.location_raw == "" and role.city is None and role.posted_at is None and role.remote is None


@respx.mock
def test_fetch_teamtailor_duplicate_guid_returned_once():
    item = "<item><title>A</title><guid>g1</guid><link>https://x/1</link></item>"
    serve(RSS.format(item + item))
    assert len(run()) == 1


@respx.mock
def test_fetch_teamtailor_bad_date_is_none_not_a_crash():
    serve(RSS.format("<item><title>A</title><guid>g1</guid><link>https://x/1</link><pubDate>whenever</pubDate></item>"))
    assert run()[0].posted_at is None


@respx.mock
def test_fetch_teamtailor_rejects_entity_expansion():
    bomb = '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;&a;">]><rss><channel><item><title>&b;</title></item></channel></rss>'
    serve(bomb)
    with pytest.raises(SourceError):
        run()


@respx.mock
def test_fetch_teamtailor_404_raises_sourcenotfound():
    serve("", status=404)
    with pytest.raises(SourceNotFound):
        run()
