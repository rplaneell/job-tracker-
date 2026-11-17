from dataclasses import FrozenInstanceError

import pytest

from jobtracker.models import Role


def make_role() -> Role:
    return Role(
        source="greenhouse",
        source_id="123",
        company="Acme",
        title="Business Analyst",
        url="https://example.com/jobs/123",
        location_raw="Zurich, Switzerland",
        city="Zurich",
        country="Switzerland",
        remote=False,
        description="Analyse things.",
        posted_at=None,
    )


def test_role_key_is_source_and_source_id():
    assert make_role().key == ("greenhouse", "123")


def test_role_is_immutable():
    role = make_role()
    with pytest.raises(FrozenInstanceError):
        role.title = "Other"
