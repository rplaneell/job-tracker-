from datetime import datetime, timezone

from fake_supabase import FakeClient
from jobtracker.models import Role
from jobtracker.store import Store

T1 = datetime(2026, 11, 17, 6, 0, tzinfo=timezone.utc)
T2 = datetime(2026, 11, 18, 6, 0, tzinfo=timezone.utc)


def role(sid="1", source="greenhouse", company="Acme", title="Analyst") -> Role:
    return Role(source, sid, company, title, f"https://x/{sid}", "Zurich", "Zurich", "Switzerland", False, "d", None)


def upsert(store, roles, now, matched=True):
    return store.upsert_roles(
        roles,
        {r.key: matched for r in roles},
        {r.key: ("consulting", "internship") for r in roles},
        now,
    )


def test_upsert_returns_only_new_roles():
    store = Store(FakeClient())
    assert [r.source_id for r in upsert(store, [role("1"), role("2")], T1)] == ["1", "2"]
    assert [r.source_id for r in upsert(store, [role("1"), role("3")], T2)] == ["3"]


def test_upsert_keeps_first_seen_on_update():
    client = FakeClient()
    store = Store(client)
    upsert(store, [role("1")], T1)
    upsert(store, [role("1", title="Analyst II")], T2)
    row = client.tables["roles"][0]
    assert row["first_seen"] == T1.isoformat() and row["last_seen"] == T2.isoformat()
    assert row["title"] == "Analyst II"


def test_upsert_reopens_closed_role():
    client = FakeClient()
    store = Store(client)
    upsert(store, [role("1")], T1)
    store.close_missing("greenhouse", "Acme", set(), T2)
    assert client.tables["roles"][0]["status"] == "closed"
    new = upsert(store, [role("1")], T2)
    assert new == [] and client.tables["roles"][0]["status"] == "open"


def test_close_missing_marks_absent_roles_closed_but_not_other_sources():
    client = FakeClient()
    store = Store(client)
    upsert(store, [role("1"), role("2"), role("9", source="lever"), role("8", company="Beta")], T1)
    closed = store.close_missing("greenhouse", "Acme", {"1"}, T2)
    status = {(r["source"], r["company"], r["source_id"]): r["status"] for r in client.tables["roles"]}
    assert closed == 1
    assert status[("greenhouse", "Acme", "2")] == "closed"
    assert status[("greenhouse", "Acme", "1")] == "open"
    assert status[("lever", "Acme", "9")] == "open"
    assert status[("greenhouse", "Beta", "8")] == "open"


def test_upsert_never_touches_applications_table():
    client = FakeClient()
    client.tables["applications"].append({"role_id": "r1", "stage": "applied", "notes": "mine"})
    store = Store(client)
    upsert(store, [role("1")], T1)
    upsert(store, [role("1")], T2)
    store.close_missing("greenhouse", "Acme", set(), T2)
    assert "applications" not in client.touched
    assert client.tables["applications"] == [{"role_id": "r1", "stage": "applied", "notes": "mine"}]


def test_record_run_stores_error_text():
    client = FakeClient()
    Store(client).record_run("Acme", False, 0, "HTTP 500", T1)
    assert client.tables["source_runs"][0]["error"] == "HTTP 500"
    assert client.tables["source_runs"][0]["ok"] is False


class OddReply:
    """A stand in whose reads return something that is not a list of rows, like an error payload."""

    def __init__(self, data):
        self.data = data

    def table(self, _name):
        return self

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def in_(self, *_a, **_k):
        return self

    def execute(self):
        from types import SimpleNamespace
        return SimpleNamespace(data=self.data)


def test_an_unexpected_database_reply_is_reported_clearly_not_as_a_type_error():
    import pytest
    store = Store(OddReply({"message": "Invalid API key", "hint": "check the key"}))
    with pytest.raises(RuntimeError) as info:
        upsert(store, [role("1")], T1)
    assert "unexpected reply" in str(info.value) and "Invalid API key" in str(info.value)


def test_the_error_reply_never_includes_more_than_300_characters():
    import pytest
    store = Store(OddReply({"message": "x" * 5000}))
    with pytest.raises(RuntimeError) as info:
        upsert(store, [role("1")], T1)
    assert len(str(info.value)) < 400


def upsert_flags(store, roles, now, flags):
    return store.upsert_roles(roles, dict(flags), {r.key: ("consulting", "internship") for r in roles}, now)


def test_a_role_that_newly_passes_the_filter_is_returned_for_review():
    store = Store(FakeClient())
    r = role("1")
    upsert_flags(store, [r], T1, {r.key: False})  # stored, but not kept
    assert [x.source_id for x in upsert_flags(store, [r], T2, {r.key: True})] == ["1"]  # the rules changed, now kept


def test_a_role_that_was_already_kept_is_not_returned_again():
    store = Store(FakeClient())
    r = role("1")
    upsert_flags(store, [r], T1, {r.key: True})
    assert upsert_flags(store, [r], T2, {r.key: True}) == []


def test_a_role_that_stops_passing_the_filter_is_not_returned():
    store = Store(FakeClient())
    r = role("1")
    upsert_flags(store, [r], T1, {r.key: True})
    assert upsert_flags(store, [r], T2, {r.key: False}) == []
