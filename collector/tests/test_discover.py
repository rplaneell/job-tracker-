import httpx
import respx

from jobtracker.discover import discover_board

NOPAUSE = lambda _s: None


@respx.mock
def test_finds_a_greenhouse_board_on_the_second_slug_variant():
    respx.get(url__regex=r"https://boards-api.greenhouse.io/v1/boards/roche-diagnostics/jobs.*").mock(
        return_value=httpx.Response(200, json={"jobs": [{"id": 1}]})
    )
    respx.route().mock(return_value=httpx.Response(404))
    with httpx.Client() as client:
        src = discover_board(client, "Roche Diagnostics", city="Basel", field="health_science", pause=NOPAUSE)
    assert src is not None
    assert (src.kind, src.board, src.name, src.city) == ("greenhouse", "roche-diagnostics", "Roche Diagnostics", "Basel")


@respx.mock
def test_returns_none_when_every_board_answers_404():
    respx.route().mock(return_value=httpx.Response(404))
    with httpx.Client() as client:
        assert discover_board(client, "Nowhere Inc", pause=NOPAUSE) is None


@respx.mock
def test_does_not_call_more_than_9_urls_per_company():
    route = respx.route().mock(return_value=httpx.Response(404))
    with httpx.Client() as client:
        discover_board(client, "Some Long Company Name", pause=NOPAUSE)
    assert route.call_count <= 9


@respx.mock
def test_empty_board_does_not_count_as_found():
    respx.route().mock(return_value=httpx.Response(200, json={"jobs": []}))
    with httpx.Client() as client:
        assert discover_board(client, "Quiet Co", pause=NOPAUSE) is None


@respx.mock
def test_lever_eu_board_is_prefixed():
    respx.get(url__regex=r"https://api.eu.lever.co/v0/postings/novo.*").mock(
        return_value=httpx.Response(200, json=[{"id": "a"}])
    )
    respx.route().mock(return_value=httpx.Response(404))
    with httpx.Client() as client:
        src = discover_board(client, "Novo", pause=NOPAUSE)
    assert src is not None and (src.kind, src.board) == ("lever", "eu:novo")
