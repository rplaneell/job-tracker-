import httpx

from jobtracker.adapters import SourceError, SourceNotFound
from jobtracker.models import Role
from jobtracker.registry import load_sources
from jobtracker.verify import check_board, display_name, load_state, save_state, verify_candidates, write_generated

COUNTRIES = ["Spain", "Switzerland", "Belgium", "Netherlands", "Denmark"]


def role(sid, country, city=None):
    return Role("lever", sid, "X", "Analyst", "https://x", "", city, country, None, "", None)


def adapters(roles=None, error=None):
    def fetch(_client, _source):
        if error:
            raise error
        return roles

    return {"lever": fetch, "greenhouse": fetch, "ashby": fetch, "personio": fetch, "teamtailor": fetch, "smartrecruiters": fetch}


def test_display_name_is_readable():
    assert display_name("acme-corp") == "Acme Corp"
    assert display_name("eu:novo_nordisk") == "Novo Nordisk"


def test_check_board_counts_roles_in_the_target_countries():
    roles = [role("1", "Switzerland", "Basel"), role("2", "Switzerland", "Basel"), role("3", "Denmark", "Copenhagen"), role("4", "France")]
    check = check_board(httpx.Client(), "lever", "acme", COUNTRIES, adapters(roles))
    assert (check.total, check.in_regions, check.city) == (4, 3, "Basel")


def test_check_board_returns_none_when_the_board_cannot_be_read():
    assert check_board(httpx.Client(), "lever", "ghost", COUNTRIES, adapters(error=SourceNotFound("nope", 404))) is None
    assert check_board(httpx.Client(), "lever", "blocked", COUNTRIES, adapters(error=SourceError("disallowed by robots.txt"))) is None
    assert check_board(httpx.Client(), "lever", "odd", COUNTRIES, adapters(error=KeyError("shape changed"))) is None


def test_verify_candidates_keeps_only_boards_with_roles_in_the_regions_and_remembers_all():
    candidates = {("lever", "eu1"): "eu1", ("lever", "us1"): "us1", ("lever", "gone"): "gone"}
    state = {}

    def fetch(_c, source):
        if source.board == "gone":
            raise SourceNotFound("nope", 404)
        return [role("1", "Belgium" if source.board == "eu1" else "United States")]

    kept = verify_candidates(candidates, httpx.Client(), COUNTRIES, state, adapters={"lever": fetch})
    assert [c.board for c in kept] == ["eu1"]
    assert set(state) == {"lever:eu1", "lever:us1", "lever:gone"}
    assert state["lever:gone"]["error"]


def test_verify_candidates_skips_boards_already_in_state():
    calls = []

    def fetch(_c, source):
        calls.append(source.board)
        return [role("1", "Spain")]

    state = {"lever:old": {"total": 1, "in_regions": 1, "city": ""}}
    kept = verify_candidates({("lever", "old"): "old", ("lever", "new"): "new"}, httpx.Client(), COUNTRIES, state, adapters={"lever": fetch})
    assert calls == ["new"] and [c.board for c in kept] == ["new"]


def test_verify_candidates_respects_the_limit():
    calls = []

    def fetch(_c, source):
        calls.append(source.board)
        return []

    cands = {("lever", f"b{i}"): f"b{i}" for i in range(10)}
    verify_candidates(cands, httpx.Client(), COUNTRIES, {}, limit=3, adapters={"lever": fetch})
    assert len(calls) == 3


def test_state_round_trips_through_a_file(tmp_path):
    path = tmp_path / "state.json"
    assert load_state(path) == {}
    save_state(path, {"lever:acme": {"total": 2, "in_regions": 1, "city": "Basel"}})
    assert load_state(path)["lever:acme"]["city"] == "Basel"


def test_write_generated_makes_a_file_the_source_loader_accepts(tmp_path):
    kept = [
        check_board(httpx.Client(), "lever", "eu:novo-labs", COUNTRIES, adapters([role("1", "Denmark", "Copenhagen")])),
        check_board(httpx.Client(), "personio", "acme", COUNTRIES, adapters([role("2", "Spain", "Barcelona")])),
    ]
    path = tmp_path / "sources.generated.yaml"
    write_generated(path, kept)
    sources = load_sources(path)
    assert {(s.kind, s.board, s.name, s.city) for s in sources} == {
        ("lever", "eu:novo-labs", "Novo Labs", "Copenhagen"),
        ("personio", "acme", "Acme", "Barcelona"),
    }
    assert all(s.terms == "ok" and "Common Crawl" in s.basis for s in sources)


def test_state_remembers_the_original_spelling_and_rebuilds_the_checks():
    from jobtracker.verify import checks_from_state

    state = {}

    def fetch(_c, source):
        return [role("1", "Belgium", "Ghent")]

    verify_candidates({("ashby", "linear"): "Linear"}, httpx.Client(), COUNTRIES, state, adapters={"ashby": fetch})
    state["ashby:ghost"] = {"error": "could not be read", "kind": "ashby", "board": "ghost"}
    state["ashby:empty"] = {"total": 5, "in_regions": 0, "city": "", "kind": "ashby", "board": "empty"}
    checks = checks_from_state(state)
    assert [(c.kind, c.board, c.in_regions, c.city) for c in checks] == [("ashby", "Linear", 1, "Ghent")]
