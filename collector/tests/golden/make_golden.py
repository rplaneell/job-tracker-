"""Regenerate the golden files. Only run this when the owner asked for a result to change, then READ the diff.

    cd collector && python tests/golden/make_golden.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scenarios import all_roles, render, scenarios  # noqa: E402

out = Path(__file__).resolve().parent / "current"
out.mkdir(exist_ok=True)
roles = all_roles()
for name, rules in scenarios().items():
    (out / f"{name}.txt").write_text(render(rules, roles))
    print("wrote", name)
