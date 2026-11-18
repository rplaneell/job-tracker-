from datetime import datetime, timezone

import httpx
import pytest

from fake_supabase import FakeClient
from jobtracker.models import Role
from jobtracker.registry import Source
from jobtracker.rules import Rules
from jobtracker.run import run_collection
from jobtracker.store import Store

NOW = datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc)
RULES = Rules(["Switzerland"], ["analyst"], ["senior"], {"consulting": ["analyst"]}, {"internship": ["intern"]})


def role(sid, title="Analyst"):
    return Role("greenhouse", sid, "Acme", title, "https://x", "Zurich", "Zurich", "Switzerland", False, "", None)


def go(roles, client=None):
    client = client or FakeClient()
    result = run_collection(
        [Source("Acme", "greenhouse", "acme", "Zurich", "consulting")], RULES, Store(client),
        httpx.Client(), NOW, lambda _s: None, adapters={"greenhouse": lambda _c, _s: roles},
    )
    return result, client


def tasks(client):
    return client.tables["agent_tasks"]


def role_ids_for(client, *source_ids):
    return {r["id"] for r in client.tables["roles"] if r["source_id"] in source_ids}


def test_new_matched_roles_are_queued_as_one_scouting_task():
    result, client = go([role("1"), role("2"), role("3")])
    assert len(tasks(client)) == 1
    t = tasks(client)[0]
    assert (t["agent_id"], t["kind"], t["status"]) == ("scout", "review_new_roles", "queued")
    assert set(t["payload"]["role_ids"]) == role_ids_for(client, "1", "2", "3")
    assert len(result.new_matched) == 3


def test_nothing_is_queued_when_there_are_no_new_matched_roles():
    _, client = go([role("1", title="Senior Manager")])  # stored but does not match the profile
    assert tasks(client) == []


def test_roles_that_do_not_match_the_profile_are_left_out_of_the_task():
    _, client = go([role("1"), role("2", title="Senior Manager")])
    assert set(tasks(client)[0]["payload"]["role_ids"]) == role_ids_for(client, "1")


def test_a_second_run_with_the_same_roles_queues_nothing_new():
    _, client = go([role("1")])
    go([role("1")], client)
    assert len(tasks(client)) == 1


def test_a_failing_queue_write_does_not_stop_the_run_or_lose_the_roles():
    class Broken(FakeClient):
        def table(self, name):
            if name == "agent_tasks":
                raise RuntimeError("database says no")
            return super().table(name)

    result, client = go([role("1")], Broken())
    assert [r.source_id for r in result.new_matched] == ["1"]
    assert result.failures == []
    assert "database says no" in result.queue_error
    assert len(client.tables["roles"]) == 1


def test_a_big_first_run_is_split_into_tasks_of_50_and_capped_at_300_roles():
    _, client = go([role(str(i)) for i in range(400)])
    sizes = [len(t["payload"]["role_ids"]) for t in tasks(client)]
    assert sizes == [50] * 6
