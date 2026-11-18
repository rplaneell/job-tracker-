"""Hostile input: a job posting's link comes from outside and must never be able to run code when clicked."""
import pytest

from jobtracker.adapters import safe_url


@pytest.mark.parametrize("url", ["https://jobs.example/acme/1", "http://example.com/x?a=1&b=2", "HTTPS://Example.com/Case"])
def test_normal_web_links_pass_unchanged(url):
    assert safe_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        "  javascript:alert(1)",
        "\tjavascript:alert(1)",
        "java\nscript:alert(1)",
        "jav&#x61;script:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "file:///etc/passwd",
        "//evil.example/x",
        "/relative/path",
        "mailto:someone@example.com",
        "",
        "not a url",
        "https://" + "a" * 3000,
    ],
)
def test_anything_that_is_not_a_plain_web_link_becomes_empty(url):
    assert safe_url(url) == ""


def test_surrounding_whitespace_is_trimmed_from_a_good_link():
    assert safe_url("  https://example.com/x \n") == "https://example.com/x"
