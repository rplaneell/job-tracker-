"""Backtest: known inputs must give exactly the saved decisions. See tests/golden/make_golden.py to regenerate."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent / "golden"))
from scenarios import all_roles, render, scenarios  # noqa: E402

GOLDEN = Path(__file__).resolve().parent / "golden" / "current"
ROLES = all_roles()
SCEN = scenarios()


@pytest.mark.parametrize("name", sorted(SCEN))
def test_decisions_match_the_golden_file(name):
    expected = (GOLDEN / f"{name}.txt").read_text().splitlines()
    actual = render(SCEN[name], ROLES).splitlines()
    assert len(actual) == len(expected), f"{name}: {len(actual)} decisions, golden has {len(expected)}"
    for i, (a, e) in enumerate(zip(actual, expected), 1):
        assert a == e, f"{name} line {i}:\n  now:    {a}\n  golden: {e}"


def test_rendering_is_stable_run_to_run():
    assert render(SCEN["default"], ROLES) == render(SCEN["default"], ROLES)


@pytest.mark.parametrize("name", [n for n in sorted(SCEN) if n != "default"])
def test_each_changed_setting_really_changes_the_output(name):
    """A scenario that silently does nothing is worthless."""
    assert render(SCEN[name], ROLES) != render(SCEN["default"], ROLES)


def test_a_tiny_change_is_noticed():
    """Prove the comparison can fail: one extra character in one title must differ."""
    from dataclasses import replace

    tweaked = [replace(ROLES[0], title=ROLES[0].title + "x")] + ROLES[1:]
    assert render(SCEN["default"], tweaked) != render(SCEN["default"], ROLES)


def test_the_real_inputs_cover_each_outcome():
    """The backtest is only useful if the inputs exercise both outcomes in the default scenario."""
    text = render(SCEN["default"], ROLES)
    assert " | MATCH | " in text and " | no | " in text
    assert len(ROLES) >= 192
