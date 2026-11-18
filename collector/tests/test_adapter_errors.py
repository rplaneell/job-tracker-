"""The error type and status each kind of failure carries. The runner's retry decisions depend on them."""
import httpx
import pytest
import respx

from jobtracker.adapters import SourceError, SourceNotFound, get_text


@respx.mock
def test_a_missing_board_is_a_not_found_error_with_status_404():
    respx.get("https://x.example/b").mock(return_value=httpx.Response(404))
    with httpx.Client() as client, pytest.raises(SourceNotFound) as err:
        get_text(client, "https://x.example/b", "x")
    assert err.value.status == 404


@respx.mock
def test_a_server_error_keeps_its_status_so_the_runner_can_retry():
    respx.get("https://x.example/b").mock(return_value=httpx.Response(503))
    with httpx.Client() as client, pytest.raises(SourceError) as err:
        get_text(client, "https://x.example/b", "x")
    assert err.value.status == 503 and not isinstance(err.value, SourceNotFound)
