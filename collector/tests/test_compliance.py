import httpx
import pytest
import respx

from jobtracker.adapters import SourceError
from jobtracker.compliance import PoliteClient

UA = "job-tracker personal tool (one check per day)"


class Clock:
    def __init__(self):
        self.now = 100.0
        self.slept = []

    def time(self):
        return self.now

    def sleep(self, s):
        self.slept.append(s)
        self.now += s


def polite(clock=None):
    clock = clock or Clock()
    return PoliteClient(httpx.Client(), UA, sleep=clock.sleep, clock=clock.time), clock


@respx.mock
def test_allows_when_robots_missing_404():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/jobs").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    assert client.get("https://a.example/jobs").text == "ok"


@respx.mock
def test_blocks_path_disallowed_for_our_user_agent():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(200, text="User-agent: *\nDisallow: /jobs\n"))
    jobs = respx.get("https://a.example/jobs").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    with pytest.raises(SourceError, match="robots"):
        client.get("https://a.example/jobs")
    assert not jobs.called


@respx.mock
def test_allows_path_not_covered_by_disallow():
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(200, text="User-agent: *\nDisallow: /app/\n"))
    respx.get("https://a.example/jobs").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    assert client.get("https://a.example/jobs").status_code == 200


@respx.mock
@pytest.mark.parametrize("status", [401, 403, 429, 500, 503])
def test_blocks_everything_when_robots_unavailable(status):
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(status))
    page = respx.get("https://a.example/jobs").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    with pytest.raises(SourceError, match="robots"):
        client.get("https://a.example/jobs")
    assert not page.called


@respx.mock
def test_blocks_when_robots_unreachable():
    respx.get("https://a.example/robots.txt").mock(side_effect=httpx.ConnectError("down"))
    client, _ = polite()
    with pytest.raises(SourceError, match="robots"):
        client.get("https://a.example/jobs")


@respx.mock
def test_robots_fetched_once_per_host():
    robots = respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get(url__regex=r"https://a.example/.*").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    client.get("https://a.example/one")
    client.get("https://a.example/two")
    assert robots.call_count == 1


@respx.mock
def test_sleeps_between_requests_to_same_host_only():
    respx.get(url__regex=r"https://[ab]\.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get(url__regex=r"https://[ab]\.example/p.*").mock(return_value=httpx.Response(200, text="ok"))
    client, clock = polite()
    client.get("https://a.example/p1")
    assert clock.slept == [1.0]  # robots fetch, then one pause before the page
    client.get("https://a.example/p2")
    assert clock.slept == [1.0, 1.0]  # a full second after the previous call to the same host
    client.get("https://b.example/p1")
    assert clock.slept == [1.0, 1.0, 1.0]  # nothing waited on before b was first contacted
    assert all(0 <= s <= 1.0 for s in clock.slept)


@respx.mock
def test_sends_user_agent_header():
    route = respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get("https://a.example/jobs").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    client.get("https://a.example/jobs")
    assert route.calls[0].request.headers["user-agent"] == UA


ASHBY = "https://api.ashbyhq.com"


@respx.mock
def test_documented_public_api_host_with_unserved_robots_is_allowed():
    respx.get(f"{ASHBY}/robots.txt").mock(return_value=httpx.Response(401, text="Unauthorized"))
    respx.get(f"{ASHBY}/posting-api/job-board/acme").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    assert client.get(f"{ASHBY}/posting-api/job-board/acme").text == "ok"


@respx.mock
def test_documented_public_api_host_explicit_disallow_still_blocks():
    respx.get(f"{ASHBY}/robots.txt").mock(return_value=httpx.Response(200, text="User-agent: *\nDisallow: /posting-api\n"))
    page = respx.get(f"{ASHBY}/posting-api/job-board/acme").mock(return_value=httpx.Response(200, text="ok"))
    client, _ = polite()
    with pytest.raises(SourceError, match="robots"):
        client.get(f"{ASHBY}/posting-api/job-board/acme")
    assert not page.called


@respx.mock
@pytest.mark.parametrize("status", [403, 500])
def test_documented_public_api_host_server_errors_and_403_still_block(status):
    respx.get(f"{ASHBY}/robots.txt").mock(return_value=httpx.Response(status))
    client, _ = polite()
    with pytest.raises(SourceError, match="robots"):
        client.get(f"{ASHBY}/posting-api/job-board/acme")


@respx.mock
def test_a_401_robots_file_on_any_other_host_still_blocks():
    respx.get("https://other.example/robots.txt").mock(return_value=httpx.Response(401))
    client, _ = polite()
    with pytest.raises(SourceError, match="robots"):
        client.get("https://other.example/jobs")


@respx.mock
def test_waits_only_the_time_that_is_still_missing():
    """Found by mutation checking: the pause is one second minus what already passed, never plus."""
    respx.get("https://a.example/robots.txt").mock(return_value=httpx.Response(404))
    respx.get(url__regex=r"https://a.example/p.*").mock(return_value=httpx.Response(200, text="ok"))
    client, clock = polite()
    client.get("https://a.example/p1")
    clock.slept.clear()
    clock.now += 0.4  # 0.4 seconds pass by themselves
    client.get("https://a.example/p2")
    assert clock.slept == [pytest.approx(0.6)]
    clock.slept.clear()
    clock.now += 5.0  # long enough ago: no wait at all
    client.get("https://a.example/p3")
    assert clock.slept == []
