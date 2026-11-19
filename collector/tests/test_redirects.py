import httpx
import pytest
import respx

from jobtracker.adapters import SourceError
from jobtracker.compliance import MAX_REDIRECTS, PoliteClient

UA = "job-tracker personal tool (one check per day)"


def polite(follow_in_client=True):
    # The wrapped client follows redirects by itself, as the real collector's client used to. The gate must not rely on that.
    return PoliteClient(httpx.Client(follow_redirects=follow_in_client), UA, sleep=lambda _s: None)


def moved(to, status=302):
    return httpx.Response(status, headers={"location": to})


@respx.mock
def test_a_redirect_to_another_host_goes_through_that_hosts_robots_rules():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://b.example/robots.txt").mock(return_value=httpx.Response(200, text="User-agent: *\nDisallow: /jobs\n"))
    respx.get("https://a.example/jobs").mock(return_value=moved("https://b.example/jobs"))
    target = respx.get("https://b.example/jobs").mock(return_value=httpx.Response(200, text="secret"))
    with pytest.raises(SourceError, match="robots"):
        polite().get("https://a.example/jobs")
    assert not target.called


@respx.mock
def test_a_redirect_to_an_allowed_host_is_followed_after_checking_it():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    robots_b = respx.get("https://b.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/jobs").mock(return_value=moved("https://b.example/list", 301))
    respx.get("https://b.example/list").mock(return_value=httpx.Response(200, text="ok"))
    assert polite().get("https://a.example/jobs").text == "ok"
    assert robots_b.called


@respx.mock
def test_a_relative_redirect_stays_on_the_same_host():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/old").mock(return_value=moved("/new"))
    respx.get("https://a.example/new").mock(return_value=httpx.Response(200, text="ok"))
    assert polite().get("https://a.example/old").text == "ok"


@respx.mock
@pytest.mark.parametrize("target", ["http://b.example/x", "https://127.0.0.1/x", "https://169.254.169.254/latest/meta-data", "https://localhost/x", "https://[::1]/x", "ftp://b.example/x"])
def test_redirects_to_plain_http_ip_addresses_or_localhost_are_refused(target):
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/jobs").mock(return_value=moved(target))
    with pytest.raises(SourceError, match="redirect"):
        polite().get("https://a.example/jobs")


@respx.mock
def test_a_redirect_loop_stops():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/jobs").mock(return_value=moved("https://a.example/jobs"))
    with pytest.raises(SourceError, match="too many redirects"):
        polite().get("https://a.example/jobs")
    assert MAX_REDIRECTS == 3


@respx.mock
def test_a_redirect_without_a_location_is_returned_as_it_is():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/jobs").mock(return_value=httpx.Response(304))
    assert polite().get("https://a.example/jobs").status_code == 304
