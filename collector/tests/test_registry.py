from pathlib import Path

import pytest

from jobtracker.registry import Source, load_sources


def write(tmp_path: Path, text: str) -> Path:
    p = tmp_path / "sources.yaml"
    p.write_text(text)
    return p


GOOD = """
- name: Acme
  kind: greenhouse
  board: acme
  city: Zurich
  field: consulting
- name: Beta
  kind: lever
  board: eu:beta
  city: Barcelona
  field: finance
"""


def test_load_sources_reads_entries(tmp_path):
    sources = load_sources(write(tmp_path, GOOD))
    assert sources[0] == Source("Acme", "greenhouse", "acme", "Zurich", "consulting")
    assert sources[1] == Source("Beta", "lever", "eu:beta", "Barcelona", "finance")


def test_load_sources_rejects_unknown_kind(tmp_path):
    bad = GOOD.replace("greenhouse", "workday")
    with pytest.raises(ValueError, match="Acme"):
        load_sources(write(tmp_path, bad))


def test_load_sources_rejects_duplicate_board(tmp_path):
    dup = GOOD + "- name: Acme2\n  kind: greenhouse\n  board: acme\n  city: Basel\n  field: vc\n"
    with pytest.raises(ValueError, match="duplicate"):
        load_sources(write(tmp_path, dup))


def test_load_sources_empty_file_returns_empty_list(tmp_path):
    assert load_sources(write(tmp_path, "")) == []


def entry(kind="personio", terms=None, board="acme"):
    extra = f"  terms: {terms}\n" if terms else ""
    return f"- name: Acme {kind}\n  kind: {kind}\n  board: {board}\n  city: Zurich\n  field: consulting\n{extra}"


def test_terms_no_entries_are_skipped(tmp_path):
    text = entry("personio", "no", "a") + entry("teamtailor", "ok", "b")
    sources = load_sources(write(tmp_path, text))
    assert [s.kind for s in sources] == ["teamtailor"]


def test_jsonld_requires_terms_ok(tmp_path):
    for terms in (None, "unreviewed"):
        with pytest.raises(ValueError, match="Acme jsonld"):
            load_sources(write(tmp_path, entry("jsonld", terms, "https://acme.example/careers")))


def test_invalid_terms_value_raises(tmp_path):
    with pytest.raises(ValueError, match="terms"):
        load_sources(write(tmp_path, entry("personio", "maybe")))


def test_official_api_kinds_default_to_ok(tmp_path):
    (s,) = load_sources(write(tmp_path, entry("smartrecruiters")))
    assert s.terms == "ok"


def test_new_kinds_are_accepted(tmp_path):
    text = "".join(entry(k, "ok", f"b{i}") for i, k in enumerate(["personio", "teamtailor", "smartrecruiters", "jsonld"]))
    assert [s.kind for s in load_sources(write(tmp_path, text))] == ["personio", "teamtailor", "smartrecruiters", "jsonld"]
