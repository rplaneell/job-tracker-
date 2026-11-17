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
