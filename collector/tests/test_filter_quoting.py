"""Role ids from company feeds are untrusted. They go into an in_ filter, so a hostile one must stay one value."""
from urllib.parse import parse_qs

import pytest
from postgrest import SyncPostgrestClient

HOSTILE = [
    "plain",
    "a,b",
    "a(b)",
    'he said "hi"',
    'x"),(source_id.eq."y',
    "back\\slash",
    "a)&select=*",
    "id=eq.1&status=eq.closed",
    "line\nbreak",
]


def encoded(values):
    client = SyncPostgrestClient("https://x.supabase.co/rest/v1", headers={})
    query = client.from_("roles").select("id").in_("source_id", values)
    return parse_qs(str(query.request.params), keep_blank_values=True)


def decode_in_list(value):
    """Reads a PostgREST list like in.(a,"b,c",d): commas separate items except inside quotes, where \\ escapes the next character."""
    assert value.startswith("in.(") and value.endswith(")")
    body, items, current, quoted, i = value[4:-1], [], [], False, 0
    while i < len(body):
        ch = body[i]
        if quoted and ch == "\\":
            current.append(body[i + 1])
            i += 1
        elif ch == '"':
            quoted = not quoted
        elif ch == "," and not quoted:
            items.append("".join(current))
            current = []
        else:
            current.append(ch)
        i += 1
    assert not quoted, "a quote was left open"
    items.append("".join(current))
    return items


def test_hostile_values_cannot_add_or_change_other_filters():
    params = encoded(HOSTILE)
    assert set(params) == {"select", "source_id"}
    assert params["select"] == ["id"]
    assert len(params["source_id"]) == 1


@pytest.mark.parametrize("value", HOSTILE)
def test_each_hostile_value_comes_back_as_exactly_one_item(value):
    params = encoded(["before", value, "after"])
    assert decode_in_list(params["source_id"][0]) == ["before", value, "after"]
