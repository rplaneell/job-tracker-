from jobtracker.models import Role
from jobtracker.notify import build_digest, send_digest
from jobtracker.run import RunResult


def role(sid, title, city="Zurich", company="Acme"):
    return Role("greenhouse", sid, company, title, f"https://x/{sid}", city or "", city, "Switzerland", False, "", None)


def test_build_digest_none_when_nothing_new_and_no_failures():
    assert build_digest(RunResult(), "https://dash") is None


def test_build_digest_lists_roles_grouped_by_city():
    result = RunResult(new_matched=[role("1", "Analyst"), role("2", "Associate", city="Basel"), role("3", "Intern")])
    subject, body = build_digest(result, "https://dash")
    assert subject == "3 new roles: Zurich"
    assert body.index("Zurich") < body.index("Basel")
    assert "https://x/1" in body and "https://dash" in body


def test_build_digest_includes_failed_sources_section():
    result = RunResult(failures=[("Ghost", "board not found")])
    subject, body = build_digest(result, "https://dash")
    assert "Sources that failed" in body and "Ghost" in body and "board not found" in body
    assert "failed" in subject


def test_build_digest_escapes_html_in_titles():
    result = RunResult(new_matched=[role("1", "<script>alert(1)</script> Analyst")])
    _, body = build_digest(result, "https://dash")
    assert "<script>" not in body and "&lt;script&gt;" in body


def test_build_digest_handles_role_without_city():
    result = RunResult(new_matched=[role("1", "Analyst", city=None)])
    subject, body = build_digest(result, "https://dash")
    assert subject == "1 new roles: Other" and "Other" in body


def test_send_digest_passes_from_and_to_from_env(monkeypatch):
    monkeypatch.setenv("ALERT_EMAIL_FROM", "from@example.com")
    monkeypatch.setenv("ALERT_EMAIL_TO", "to@example.com")
    sent = []
    send_digest("Subject", "<p>Hi</p>", sent.append)
    assert sent == [{"from": "from@example.com", "to": ["to@example.com"], "subject": "Subject", "html": "<p>Hi</p>"}]


def test_deliver_sends_nothing_when_digest_is_none():
    from jobtracker.notify import deliver

    sent = []
    assert deliver(RunResult(), "https://dash", sent.append) is False
    assert sent == []


def test_deliver_sends_when_there_is_news(monkeypatch):
    from jobtracker.notify import deliver

    monkeypatch.setenv("ALERT_EMAIL_FROM", "from@example.com")
    monkeypatch.setenv("ALERT_EMAIL_TO", "to@example.com")
    sent = []
    assert deliver(RunResult(new_matched=[role("1", "Analyst")]), "https://dash", sent.append) is True
    assert len(sent) == 1
