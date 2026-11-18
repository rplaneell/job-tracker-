from pathlib import Path

import httpx
import pytest
import respx

from jobtracker.adapters import SourceError, SourceNotFound
from jobtracker.adapters.personio import fetch_personio
from jobtracker.registry import Source

FIXTURE = (Path(__file__).parent / "fixtures" / "personio.xml").read_text()
SRC = Source("Acme", "personio", "acme", "Berlin", "consulting")
URL = "https://acme.jobs.personio.de/xml"


def serve(text, status=200):
    respx.get(URL, params={"language": "en"}).mock(return_value=httpx.Response(status, text=text))


def run():
    with httpx.Client() as client:
        return fetch_personio(client, SRC)


@respx.mock
def test_fetch_personio_maps_fields():
    serve(FIXTURE)
    first = run()[0]
    assert first.source == "personio"
    assert first.source_id == "2885178"
    assert first.url == "https://acme.jobs.personio.de/job/2885178"
    assert first.title == "Business Development Representative (d/f/m)"
    assert first.location_raw == "Berlin"
    assert first.company == "Acme"
    assert first.description and "<" not in first.description
    assert first.posted_at is not None and (first.posted_at.year, first.posted_at.month) == (2026, 11)


@respx.mock
def test_fetch_personio_missing_office_gives_empty_location():
    serve("<workzag-jobs><position><id>1</id><name>Analyst</name></position></workzag-jobs>")
    role = run()[0]
    assert role.location_raw == "" and role.city is None and role.posted_at is None


@respx.mock
def test_fetch_personio_duplicate_ids_returned_once():
    pos = "<position><id>7</id><name>Analyst</name><office>Zurich</office></position>"
    serve(f"<workzag-jobs>{pos}{pos}</workzag-jobs>")
    roles = run()
    assert len(roles) == 1 and roles[0].city == "Zurich"


@respx.mock
def test_fetch_personio_rejects_entity_expansion():
    bomb = (
        '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;">]>'
        "<workzag-jobs><position><id>1</id><name>&b;</name></position></workzag-jobs>"
    )
    serve(bomb)
    with pytest.raises(SourceError):
        run()


@respx.mock
def test_fetch_personio_invalid_xml_raises_sourceerror():
    serve("this is not xml")
    with pytest.raises(SourceError):
        run()


@respx.mock
def test_fetch_personio_404_raises_sourcenotfound():
    serve("", status=404)
    with pytest.raises(SourceNotFound):
        run()
