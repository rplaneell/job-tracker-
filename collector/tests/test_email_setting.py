import pytest

from jobtracker.run import check_email_setting


@pytest.mark.parametrize("good", ["me@example.com", "  me@example.com \n", "Job Tracker <alerts@example.com>", "a.b+c@sub.example.co.uk"])
def test_valid_addresses_are_accepted_and_trimmed(good):
    assert check_email_setting("ALERT_EMAIL_TO", good) == good.strip()


@pytest.mark.parametrize(
    "bad",
    ["", "not an email", "me@", "@example.com", "me@example", '"me@example.com"', "me@example.com, you@example.com", "Name <me@example>", "me@@example.com"],
)
def test_anything_else_is_refused_naming_the_setting(bad):
    with pytest.raises(SystemExit) as info:
        check_email_setting("ALERT_EMAIL_TO", bad)
    message = str(info.value)
    assert "ALERT_EMAIL_TO" in message and "email@example.com" in message


def test_the_message_never_repeats_the_value_it_was_given():
    with pytest.raises(SystemExit) as info:
        check_email_setting("ALERT_EMAIL_FROM", "secret-looking-value")
    assert "secret-looking-value" not in str(info.value)


# A wrong email setting must never stop the job collection: roles are saved first, then the email problem is reported.

def test_email_problem_is_none_for_two_good_settings_and_names_the_first_bad_one():
    from jobtracker.run import email_problem

    assert email_problem("me@example.com", "Job Tracker <alerts@example.com>") is None
    assert "ALERT_EMAIL_FROM" in email_problem("me@example.com", "")
    assert "ALERT_EMAIL_TO" in email_problem("", "alerts@example.com")
    assert "secret-looking-value" not in email_problem("secret-looking-value", "x")


def test_collection_still_runs_and_saves_when_the_sender_address_is_missing(monkeypatch, capsys):
    from types import SimpleNamespace

    import supabase

    from jobtracker import run

    calls = []
    monkeypatch.setattr(supabase, "create_client", lambda url, key: object())
    monkeypatch.setattr(run, "run_collection", lambda *a, **k: calls.append("collected") or SimpleNamespace(total_seen=5, new_matched=[], failures=[], queue_error=None))
    monkeypatch.setattr(run, "Store", lambda db: object())
    for name, value in {"SUPABASE_URL": "https://abc123.supabase.co", "SUPABASE_SERVICE_ROLE_KEY": "k", "RESEND_API_KEY": "r",
                        "ALERT_EMAIL_TO": "me@example.com", "ALERT_EMAIL_FROM": ""}.items():
        monkeypatch.setenv(name, value)

    code = run.main()

    out = capsys.readouterr().out
    assert calls == ["collected"]
    assert code == 1  # the job still shows red, so the owner fixes the secret
    assert "roles were saved, but the email was not sent" in out and "ALERT_EMAIL_FROM" in out
