from datetime import datetime, timezone

import httpx

from fake_supabase import FakeClient
from jobtracker.adapters import SourceError, SourceNotFound
from jobtracker.models import Role
from jobtracker.registry import Source
from jobtracker.rules import Rules
from jobtracker.run import run_collection
from jobtracker.store import Store

NOW = datetime(2026, 11, 17, 6, 0, tzinfo=timezone.utc)
RULES = Rules(["Switzerland"], ["analyst"], ["senior"], {"consulting": ["analyst"]}, {"internship": ["intern"]})


def role(sid, title="Analyst", country="Switzerland", source="greenhouse", company="Acme"):
    return Role(source, sid, company, title, "https://x", "Zurich", "Zurich", country, False, "", None)


def src(name, kind="greenhouse", board=None):
    return Source(name, kind, board or name.lower(), "Zurich", "consulting")


def go(sources, adapters, client=None, sleeps=None):
    client = client or FakeClient()
    sleeps = sleeps if sleeps is not None else []
    result = run_collection(
        sources, RULES, Store(client), httpx.Client(), NOW, sleeps.append, adapters=adapters
    )
    return result, client, sleeps


def test_one_failing_source_does_not_stop_others():
    def adapter(_c, s):
        if s.name == "Bad":
            raise KeyError("shape changed")
        return [role("1", company=s.name)]

    result, client, _ = go([src("Bad"), src("Good")], {"greenhouse": adapter})
    assert [r.company for r in result.new_matched] == ["Good"]
    assert result.failures and result.failures[0][0] == "Bad"
    runs = {r["source_name"]: r["ok"] for r in client.tables["source_runs"]}
    assert runs == {"Bad": False, "Good": True}


def test_not_found_board_recorded_as_failed_in_source_runs():
    def adapter(_c, s):
        raise SourceNotFound("nope", 404)

    result, client, _ = go([src("Ghost")], {"greenhouse": adapter})
    assert client.tables["source_runs"][0]["ok"] is False
    assert "nope" in client.tables["source_runs"][0]["error"]
    assert result.failures == [("Ghost", "nope")]


def test_429_is_retried_once_then_marked_failed():
    calls = []

    def adapter(_c, s):
        calls.append(1)
        raise SourceError("slow down", 429)

    result, _, sleeps = go([src("Busy")], {"greenhouse": adapter})
    assert len(calls) == 2 and result.failures[0][0] == "Busy"
    assert any(s >= 5 for s in sleeps)


def test_429_then_success_counts_as_success():
    calls = []

    def adapter(_c, s):
        calls.append(1)
        if len(calls) == 1:
            raise SourceError("slow down", 429)
        return [role("1")]

    result, _, _ = go([src("Busy")], {"greenhouse": adapter})
    assert result.failures == [] and len(result.new_matched) == 1


def test_sleeps_between_calls_to_same_host():
    result, _, sleeps = go([src("A"), src("B")], {"greenhouse": lambda _c, s: []})
    assert sleeps and all(s >= 1.0 for s in sleeps)


def test_only_new_matched_roles_returned_for_email():
    adapter = lambda _c, s: [role("1"), role("2", title="Senior Analyst"), role("3", country="France")]
    first, client, _ = go([src("Acme")], {"greenhouse": adapter})
    assert [r.source_id for r in first.new_matched] == ["1"]
    assert first.total_seen == 3 and len(client.tables["roles"]) == 3
    second, _, _ = go([src("Acme")], {"greenhouse": adapter}, client=client)
    assert second.new_matched == []


def test_empty_board_does_not_close_existing_roles():
    client = FakeClient()
    go([src("Acme")], {"greenhouse": lambda _c, s: [role("1")]}, client=client)
    result, _, _ = go([src("Acme")], {"greenhouse": lambda _c, s: []}, client=client)
    assert client.tables["roles"][0]["status"] == "open"
    assert "not closed" in client.tables["source_runs"][-1]["error"]
    assert result.failures == []


def test_vanished_role_is_closed_when_board_still_has_others():
    client = FakeClient()
    go([src("Acme")], {"greenhouse": lambda _c, s: [role("1"), role("2")]}, client=client)
    go([src("Acme")], {"greenhouse": lambda _c, s: [role("1")]}, client=client)
    status = {r["source_id"]: r["status"] for r in client.tables["roles"]}
    assert status == {"1": "open", "2": "closed"}


def test_repo_root_contains_config_files():
    from jobtracker.run import repo_root

    assert (repo_root() / "sources.yaml").exists() and (repo_root() / "rules.yaml").exists()


def test_run_registers_adapter_for_each_kind():
    from jobtracker.run import ADAPTERS

    assert set(ADAPTERS) == {"greenhouse", "lever", "ashby", "personio", "teamtailor", "smartrecruiters", "jsonld"}


def test_make_client_is_the_polite_client():
    from jobtracker.compliance import PoliteClient
    from jobtracker.run import make_client

    client = make_client()
    assert isinstance(client, PoliteClient)
    client.client.close()
