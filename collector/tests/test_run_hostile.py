"""Hostile input through the whole collector: bad links never reach the database or the email."""
from datetime import datetime, timezone

import httpx
from fake_supabase import FakeClient

from jobtracker.models import Role
from jobtracker.notify import build_digest
from jobtracker.registry import Source
from jobtracker.rules import Rules
from jobtracker.run import RunResult, run_collection
from jobtracker.store import Store

NOW = datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc)
RULES = Rules(["Spain"], ["analyst"], [], {}, {})
HOSTILE = "javascript:alert(document.cookie)"


def hostile_role():
    return Role("greenhouse", "1", "Acme", "Analyst", HOSTILE, "Madrid", "Madrid", "Spain", None, "", None)


def test_a_hostile_link_is_stored_as_empty():
    client = FakeClient()
    run_collection([Source("Acme", "greenhouse", "acme", "", "")], RULES, Store(client), httpx.Client(), NOW, lambda s: None,
                   adapters={"greenhouse": lambda c, s: [hostile_role()]})
    assert client.tables["roles"][0]["url"] == ""


def test_the_digest_never_links_to_a_hostile_address():
    from dataclasses import replace

    role = replace(hostile_role(), url=HOSTILE)  # even if one slipped past, the email must not link it
    _, body = build_digest(RunResult(new_matched=[role]), "https://dash")
    assert "javascript:" not in body.lower()


def test_hostile_text_in_every_field_is_escaped_in_the_email():
    payload = '<img src=x onerror=alert(1)>"\'><script>alert(1)</script>'
    role = Role("g", "1", payload, payload, "https://x/1", payload, payload, "Spain", None, payload, None)
    _, body = build_digest(RunResult(new_matched=[role], failures=[(payload, payload)]), "https://dash")
    assert "<img" not in body and "<script" not in body
    assert "&lt;img" in body and "&lt;script&gt;" in body


def test_a_hostile_title_is_escaped_even_when_the_role_has_no_usable_link():
    """Found by mutation checking: the no link branch of the email was never tested."""
    payload = "<img src=x onerror=alert(1)>"
    role = Role("g", "1", "Acme", payload, "javascript:alert(1)", "", None, "Spain", None, "", None)
    _, body = build_digest(RunResult(new_matched=[role]), "https://dash")
    assert "<img" not in body and "&lt;img" in body
