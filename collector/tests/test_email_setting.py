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
